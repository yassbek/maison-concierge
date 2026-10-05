import { WORKSPACE_ID } from "@crm/auth";
import type { Db, Prisma } from "@crm/db";
import {
	type ConciergeCommand,
	type ConciergeCommandResult,
	type ConciergeServiceInput,
	type ConciergeSnapshot,
	conciergeCommand,
	conciergeSnapshot,
	intakeProposal,
} from "@crm/validation/concierge";
import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";
import { CONCIERGE } from "./concierge-config";
import {
	composeBrief,
	termsMismatch,
	totalsOf,
	validateService,
} from "./concierge-domain";
import {
	createBriefShare,
	readClientBrief,
	revokeBriefShare,
} from "./concierge-sharing";

@Injectable()
export class ConciergeService {
	constructor(@InjectDatabase() private readonly db: Db) {}

	private async access(userId: string) {
		const member = await this.db.member.findFirst({
			where: { userId, organizationId: WORKSPACE_ID },
			include: { user: true },
		});
		if (!member)
			throw new ForbiddenException("Workspace membership is required.");
		return {
			member,
			financials: member.role === "owner" || member.role === "admin",
		};
	}

	async snapshot(userId: string): Promise<ConciergeSnapshot> {
		const { member, financials } = await this.access(userId);
		const limit = CONCIERGE.snapshot.maxRecords;
		const [clients, suppliers, cases, team, activity] = await Promise.all([
			this.db.clientProfile.findMany({
				include: { contact: true, _count: { select: { cases: true } } },
				take: limit,
				orderBy: { createdAt: "asc" },
			}),
			this.db.supplierProfile.findMany({
				include: { company: true },
				take: limit,
				orderBy: { createdAt: "asc" },
			}),
			this.db.conciergeCase.findMany({
				include: {
					client: { include: { contact: true } },
					assignee: true,
					services: { orderBy: { startsAt: "asc" }, take: limit },
					tasks: {
						include: { assignee: true },
						orderBy: { dueAt: "asc" },
						take: limit,
					},
					documents: {
						where: financials ? {} : { audience: { not: "internal" } },
						orderBy: { createdAt: "desc" },
						take: limit,
					},
				},
				take: limit,
				orderBy: { startsAt: "asc" },
			}),
			this.db.member.findMany({
				where: { organizationId: WORKSPACE_ID },
				include: { user: true },
				take: limit,
				orderBy: { createdAt: "asc" },
			}),
			this.db.conciergeActivity.findMany({
				orderBy: { createdAt: "desc" },
				take: CONCIERGE.snapshot.maxActivity,
			}),
		]);
		const inbox = await this.db.conciergeIntake.findMany({
			take: limit,
			orderBy: { createdAt: "desc" },
		});
		const now = new Date();
		const services = cases.flatMap((row) => row.services);
		const tasks = cases.flatMap((row) => row.tasks);
		const day = now.toISOString().slice(0, 10);
		return conciergeSnapshot.parse({
			asOf: now.toISOString(),
			permissions: {
				role: member.role,
				canViewFinancials: financials,
				canManageFinancials: financials,
				userId,
			},
			team: team.map((row) => ({
				id: row.userId,
				name: row.user.name,
				email: row.user.email,
				role: row.role,
			})),
			clients: clients.map((row) => ({
				id: row.id,
				contactId: row.contactId,
				name: [row.contact.firstName, row.contact.lastName]
					.filter(Boolean)
					.join(" "),
				email: row.contact.email,
				phone: row.contact.phone,
				tier: row.tier,
				preferences: row.preferences,
				dietary: row.dietary,
				notes: row.notes,
				defaultMarkupPercent: financials ? row.defaultMarkupPercent : null,
				caseCount: row._count.cases,
			})),
			suppliers: suppliers.map((row) => ({ ...row, name: row.company.name })),
			cases: cases.map((row) => {
				const live = row.services.filter(
					(service) => service.status !== "cancelled",
				);
				const alerts: string[] = [];
				if (financials && live.some((service) => service.costCents === null))
					alerts.push("Supplier costs are incomplete. Margin is unavailable.");
				if (live.some(termsMismatch))
					alerts.push("Supplier and client terms differ. Review exposure.");
				if (
					live.some(
						(service) =>
							service.status !== "confirmed" && service.status !== "completed",
					)
				)
					alerts.push("Supplier confirmation outstanding.");
				if (row.tasks.some((task) => !task.completedAt && task.dueAt < now))
					alerts.push("An open task is overdue.");
				if (!row.assigneeId) alerts.push("Assign a concierge.");
				return {
					...row,
					startsAt: row.startsAt.toISOString(),
					endsAt: row.endsAt.toISOString(),
					updatedAt: row.updatedAt.toISOString(),
					clientName: [
						row.client.contact.firstName,
						row.client.contact.lastName,
					]
						.filter(Boolean)
						.join(" "),
					assigneeName: row.assignee?.name ?? null,
					serviceCount: live.length,
					confirmedCount: live.filter(
						(service) =>
							service.status === "confirmed" || service.status === "completed",
					).length,
					openTaskCount: row.tasks.filter((task) => !task.completedAt).length,
					alerts,
					totals: totalsOf(row.services, financials),
				};
			}),
			services: services.map((row) => ({
				...row,
				startsAt: row.startsAt.toISOString(),
				endsAt: row.endsAt?.toISOString() ?? null,
				updatedAt: row.updatedAt.toISOString(),
				confirmedAt: row.confirmedAt?.toISOString() ?? null,
				costCents: financials ? row.costCents : null,
				marginCents:
					financials && row.costCents !== null
						? row.sellCents - row.costCents
						: null,
				termsMismatch: termsMismatch(row),
			})),
			tasks: tasks.map((row) => ({
				...row,
				dueAt: row.dueAt.toISOString(),
				completedAt: row.completedAt?.toISOString() ?? null,
				assigneeName: row.assignee?.name ?? null,
				overdue: !row.completedAt && row.dueAt < now,
			})),
			inbox: inbox.map((row) => ({
				...row,
				proposal:
					row.proposal === null ? null : intakeProposal.parse(row.proposal),
				createdAt: row.createdAt.toISOString(),
				reviewedAt: row.reviewedAt?.toISOString() ?? null,
			})),
			documents: cases
				.flatMap((row) => row.documents)
				.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
			activity: activity.map((row) => ({
				...row,
				createdAt: row.createdAt.toISOString(),
			})),
			stats: {
				activeCases: cases.filter(
					(row) => row.status !== "completed" && row.status !== "cancelled",
				).length,
				arrivingToday: cases.filter(
					(row) =>
						row.startsAt.toISOString().slice(0, 10) === day &&
						row.status !== "cancelled",
				).length,
				pendingConfirmations: services.filter(
					(row) =>
						!["confirmed", "completed", "cancelled"].includes(row.status),
				).length,
				openTasks: tasks.filter((row) => !row.completedAt).length,
				pendingIntake: inbox.filter(
					(row) => row.status === "pending" || row.status === "proposed",
				).length,
				totals: totalsOf(services, financials),
			},
		});
	}

	async publicBrief(token: string) {
		return readClientBrief(this.db, token);
	}

	async command(userId: string, raw: ConciergeCommand) {
		const input = conciergeCommand.parse(raw);
		const { member, financials } = await this.access(userId);
		return this.db.$transaction(async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('concierge-command'))`;
			let result: ConciergeCommandResult;
			let body: string | null;
			switch (input.type) {
				case "createBriefShare": {
					({ result, body } = await createBriefShare(
						tx,
						input.documentId,
						input.expiresInDays,
						userId,
						financials,
					));
					break;
				}
				case "revokeBriefShare": {
					({ result, body } = await revokeBriefShare(
						tx,
						input.documentId,
						financials,
					));
					break;
				}
				case "createClient": {
					({ result, body } = await this.createClient(
						tx,
						input,
						userId,
						financials,
					));
					break;
				}
				case "createSupplier": {
					const company = await tx.company.create({
						data: {
							id: crypto.randomUUID(),
							name: input.name,
							email: input.email.toLowerCase(),
							phone: input.phone,
							ownerId: userId,
						},
					});
					const { type, name, ...fields } = input;
					const row = await tx.supplierProfile.create({
						data: {
							...fields,
							id: crypto.randomUUID(),
							companyId: company.id,
							email: input.email.toLowerCase(),
						},
					});
					result = { id: row.id, caseId: null };
					body = `Supplier created: ${company.name}`;
					break;
				}
				case "createCase": {
					if (new Date(input.endsAt) < new Date(input.startsAt))
						throw new BadRequestException("End date must follow start date.");
					await this.assignee(tx, input.assigneeId);
					const client = await tx.clientProfile.findUnique({
						where: { id: input.clientId },
					});
					if (!client) throw new NotFoundException("Client does not exist.");
					const id = crypto.randomUUID();
					const row = await tx.conciergeCase.create({
						data: {
							id,
							reference: `MSN-${id.slice(0, 8).toUpperCase()}`,
							title: input.title,
							clientId: input.clientId,
							destination: input.destination,
							startsAt: input.startsAt,
							endsAt: input.endsAt,
							priority: input.priority,
							assigneeId: input.assigneeId,
							notes: input.notes,
						},
					});
					result = { id: row.id, caseId: row.id };
					body = `Created case: ${row.title}`;
					break;
				}
				case "updateCase": {
					({ result, body } = await this.updateCase(tx, input));
					break;
				}
				case "upsertService": {
					result = await this.saveService(
						tx,
						input.service,
						financials,
						member.user.name,
					);
					body = `Service ${input.service.status}: ${input.service.title}`;
					break;
				}
				case "createTask": {
					await this.case(tx, input.caseId);
					await this.assignee(tx, input.assigneeId);
					const { type, ...data } = input;
					const row = await tx.conciergeTask.create({
						data: { ...data, id: crypto.randomUUID() },
					});
					result = { id: row.id, caseId: row.caseId };
					body = `Task created: ${row.title}`;
					break;
				}
				case "completeTask": {
					const task = await tx.conciergeTask.findUnique({
						where: { id: input.taskId },
					});
					if (!task) throw new NotFoundException("Task does not exist.");
					await tx.conciergeTask.update({
						where: { id: task.id },
						data: { completedAt: input.completed ? new Date() : null },
					});
					result = { id: task.id, caseId: task.caseId };
					body = `Task ${input.completed ? "completed" : "reopened"}: ${task.title}`;
					break;
				}
				case "addNote": {
					await this.case(tx, input.caseId);
					result = { id: crypto.randomUUID(), caseId: input.caseId };
					body = input.body;
					break;
				}
				case "captureIntake": {
					if (input.caseId) await this.case(tx, input.caseId);
					const { type, ...data } = input;
					const row = await tx.conciergeIntake.create({
						data: { ...data, id: crypto.randomUUID() },
					});
					result = { id: row.id, caseId: row.caseId };
					body = `Captured ${input.channel} intake from ${input.sender}`;
					break;
				}
				case "approveIntake": {
					({ result, body } = await this.approveIntake(
						tx,
						input,
						userId,
						financials,
						member.user.name,
					));
					break;
				}
				case "dismissIntake": {
					({ result, body } = await this.dismissIntake(tx, input, userId));
					break;
				}
				case "createBrief": {
					({ result, body } = await this.createBrief(
						tx,
						input,
						userId,
						financials,
					));
					break;
				}
				case "updateSupplier": {
					const { type, supplierId, ...data } = input;
					const supplier = await tx.supplierProfile.findUnique({
						where: { id: supplierId },
					});
					if (!supplier)
						throw new NotFoundException("Supplier does not exist.");
					await tx.supplierProfile.update({ where: { id: supplierId }, data });
					result = { id: supplierId, caseId: null };
					body = `Supplier profile updated: ${supplierId}`;
					break;
				}
				case "updateClient": {
					if (!financials && input.defaultMarkupPercent !== undefined)
						throw new ForbiddenException(
							"Only an owner or admin can change client markup.",
						);
					const { type, clientId, ...data } = input;
					const client = await tx.clientProfile.findUnique({
						where: { id: clientId },
					});
					if (!client) throw new NotFoundException("Client does not exist.");
					await tx.clientProfile.update({ where: { id: clientId }, data });
					result = { id: clientId, caseId: null };
					body = `Client profile updated: ${clientId}`;
					break;
				}
			}
			if (body === null) return result;
			await tx.conciergeActivity.create({
				data: {
					id: input.type === "addNote" ? result.id : crypto.randomUUID(),
					caseId: result.caseId,
					actorId: userId,
					actorName: member.user.name,
					kind: input.type,
					body,
				},
			});
			if (result.caseId)
				await tx.conciergeCase.update({
					where: { id: result.caseId },
					data: { updatedAt: new Date() },
				});
			return result;
		});
	}

	private async createClient(
		tx: Prisma.TransactionClient,
		input: Extract<ConciergeCommand, { type: "createClient" }>,
		userId: string,
		financials: boolean,
	) {
		if (!financials && input.defaultMarkupPercent !== undefined)
			throw new ForbiddenException(
				"Only an owner or admin can set client markup.",
			);
		const email = input.email.toLowerCase();
		const existing = await tx.contact.findFirst({
			where: {
				email: { equals: email, mode: "insensitive" },
				archivedAt: null,
			},
			include: { conciergeClient: true },
		});
		if (existing?.conciergeClient)
			throw new BadRequestException(
				"This contact already has a client profile.",
			);
		const contact =
			existing ??
			(await tx.contact.create({
				data: {
					id: crypto.randomUUID(),
					firstName: input.firstName,
					lastName: input.lastName,
					email,
					phone: input.phone,
					ownerId: userId,
				},
			}));
		const row = await tx.clientProfile.create({
			data: {
				id: crypto.randomUUID(),
				contactId: contact.id,
				tier: input.tier,
				preferences: input.preferences,
				dietary: input.dietary,
				notes: input.notes,
				defaultMarkupPercent: input.defaultMarkupPercent,
			},
		});
		const result = { id: row.id, caseId: null };
		const body = `Client created: ${contact.firstName} ${contact.lastName ?? ""}`;
		return { result, body };
	}

	private async updateCase(
		tx: Prisma.TransactionClient,
		input: Extract<ConciergeCommand, { type: "updateCase" }>,
	) {
		await this.case(tx, input.caseId);
		if (input.assigneeId !== undefined)
			await this.assignee(tx, input.assigneeId);
		if (input.status === "confirmed" || input.status === "completed") {
			const services = await tx.serviceSegment.findMany({
				where: { caseId: input.caseId, status: { not: "cancelled" } },
			});
			const allowed =
				input.status === "completed"
					? ["completed"]
					: ["confirmed", "completed"];
			if (
				!services.length ||
				services.some((service) => !allowed.includes(service.status))
			)
				throw new BadRequestException(
					`All active services must be ${input.status}.`,
				);
		}
		const { type, caseId, ...data } = input;
		await tx.conciergeCase.update({ where: { id: caseId }, data });
		if (input.status === "cancelled")
			await tx.serviceSegment.updateMany({
				where: { caseId, status: { not: "completed" } },
				data: { status: "cancelled" },
			});
		const result = { id: caseId, caseId };
		const body = `Case updated${input.status ? `: ${input.status}` : ""}${input.assigneeId !== undefined ? `; assigned to ${input.assigneeId ?? "nobody"}` : ""}`;
		return { result, body };
	}

	private async approveIntake(
		tx: Prisma.TransactionClient,
		input: Extract<ConciergeCommand, { type: "approveIntake" }>,
		userId: string,
		financials: boolean,
		actorName: string,
	) {
		const intake = await tx.conciergeIntake.findUnique({
			where: { id: input.intakeId },
		});
		if (!intake) throw new NotFoundException("Intake does not exist.");
		if (intake.status === "approved")
			return { result: { id: intake.id, caseId: intake.caseId }, body: null };
		if (intake.status === "dismissed")
			throw new BadRequestException("Dismissed intake cannot be approved.");
		await this.case(tx, input.caseId);
		if (input.service) {
			if (input.service.caseId !== input.caseId)
				throw new BadRequestException(
					"The service must belong to the selected case.",
				);
			if (["confirmed", "completed"].includes(input.service.status))
				throw new BadRequestException(
					"Intake approval cannot confirm services. Record supplier confirmation separately.",
				);
			await this.saveService(tx, input.service, financials, actorName);
		}
		await tx.conciergeIntake.update({
			where: { id: intake.id },
			data: {
				caseId: input.caseId,
				status: "approved",
				reviewNote: input.note,
				reviewedBy: userId,
				reviewedAt: new Date(),
			},
		});
		const result = { id: intake.id, caseId: input.caseId };
		const body = `Intake reviewed and approved: ${input.note}`;
		return { result, body };
	}

	private async dismissIntake(
		tx: Prisma.TransactionClient,
		input: Extract<ConciergeCommand, { type: "dismissIntake" }>,
		userId: string,
	) {
		const intake = await tx.conciergeIntake.findUnique({
			where: { id: input.intakeId },
		});
		if (!intake) throw new NotFoundException("Intake does not exist.");
		if (intake.status === "dismissed")
			return { result: { id: intake.id, caseId: intake.caseId }, body: null };
		if (intake.status === "approved")
			throw new BadRequestException("Approved intake cannot be dismissed.");
		await tx.conciergeIntake.update({
			where: { id: intake.id },
			data: {
				status: "dismissed",
				reviewNote: input.reason,
				reviewedBy: userId,
				reviewedAt: new Date(),
			},
		});
		const result = { id: intake.id, caseId: intake.caseId };
		const body = `Intake dismissed: ${input.reason}`;
		return { result, body };
	}

	private async createBrief(
		tx: Prisma.TransactionClient,
		input: Extract<ConciergeCommand, { type: "createBrief" }>,
		userId: string,
		financials: boolean,
	) {
		if (input.audience === "internal" && !financials)
			throw new ForbiddenException(
				"Only an owner or admin can create internal briefs.",
			);
		if (input.audience === "supplier" && !input.supplierId)
			throw new BadRequestException("Select a supplier for the brief.");
		const row = await tx.conciergeCase.findUnique({
			where: { id: input.caseId },
			include: {
				client: { include: { contact: true } },
				services: {
					where: {
						status: { not: "cancelled" },
						...(input.audience === "supplier"
							? { supplierId: input.supplierId }
							: {}),
					},
					orderBy: { startsAt: "asc" },
				},
			},
		});
		if (!row) throw new NotFoundException("Case does not exist.");
		if (!row.services.length)
			throw new BadRequestException(
				"Add an active service before creating a brief.",
			);
		const version =
			(
				await tx.conciergeDocument.aggregate({
					where: { caseId: row.id, audience: input.audience },
					_max: { version: true },
				})
			)._max.version ?? 0;
		const document = await tx.conciergeDocument.create({
			data: {
				id: crypto.randomUUID(),
				caseId: row.id,
				title: `${row.title} · ${input.audience} brief`,
				audience: input.audience,
				supplierId: input.audience === "supplier" ? input.supplierId : null,
				content: composeBrief({
					reference: row.reference,
					title: row.title,
					clientName: [
						row.client.contact.firstName,
						row.client.contact.lastName,
					]
						.filter(Boolean)
						.join(" "),
					audience: input.audience,
					services: row.services,
				}),
				version: version + 1,
				createdBy: userId,
			},
		});
		const result = { id: document.id, caseId: row.id };
		const body = `Created ${input.audience} brief, version ${document.version}`;
		return { result, body };
	}

	private async case(tx: Prisma.TransactionClient, id: string) {
		const row = await tx.conciergeCase.findUnique({ where: { id } });
		if (!row) throw new NotFoundException("Case does not exist.");
		return row;
	}

	private async assignee(tx: Prisma.TransactionClient, userId: string | null) {
		if (!userId) return;
		const member = await tx.member.findFirst({
			where: { userId, organizationId: WORKSPACE_ID },
		});
		if (!member)
			throw new BadRequestException("Assignee must belong to this workspace.");
	}

	private async saveService(
		tx: Prisma.TransactionClient,
		service: ConciergeServiceInput,
		financials: boolean,
		actorName: string,
	) {
		validateService(service);
		if (!financials && service.costCents !== undefined)
			throw new ForbiddenException(
				"Only an owner or admin can change supplier costs.",
			);
		const parent = await this.case(tx, service.caseId);
		if (parent.status === "cancelled" || parent.status === "completed")
			throw new BadRequestException(
				"Reopen the case before changing services.",
			);
		if (service.supplierId) {
			const supplier = await tx.supplierProfile.findUnique({
				where: { id: service.supplierId },
			});
			if (!supplier?.active)
				throw new BadRequestException("Select an active supplier.");
		}
		const existing = service.id
			? await tx.serviceSegment.findUnique({ where: { id: service.id } })
			: null;
		if (service.id && !existing)
			throw new NotFoundException("Service does not exist.");
		if (existing && existing.caseId !== service.caseId)
			throw new BadRequestException("A service cannot move between cases.");
		const { id, ...fields } = service;
		const confirmed =
			service.status === "confirmed" || service.status === "completed";
		const data = {
			...fields,
			confirmationBy: confirmed ? actorName : null,
			confirmedAt: confirmed ? new Date() : null,
		};
		const row = existing
			? await tx.serviceSegment.update({ where: { id: existing.id }, data })
			: await tx.serviceSegment.create({
					data: { ...data, id: crypto.randomUUID() },
				});
		if (
			["confirmed", "in_progress"].includes(parent.status) &&
			!["confirmed", "completed", "cancelled"].includes(service.status)
		) {
			await tx.conciergeCase.update({
				where: { id: parent.id },
				data: { status: "planning" },
			});
		}
		return { id: row.id, caseId: row.caseId };
	}
}
