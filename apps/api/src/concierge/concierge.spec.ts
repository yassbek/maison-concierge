import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { db } from "@crm/db";
import {
	type ConciergeServiceInput,
	conciergeCommand,
} from "@crm/validation/concierge";
import { ConciergeService } from "./concierge.service";
import { composeBrief, totalsOf } from "./concierge-domain";

const run = crypto.randomUUID();
const owner = `owner-${run}`;
const member = `member-${run}`;
const profileId = `profile-${run}`;
const supplierId = `supplier-${run}`;
const caseId = `case-${run}`;
const api = new ConciergeService(db);
const service: ConciergeServiceInput = {
	caseId,
	title: "Test transfer",
	category: "transfer",
	status: "offered",
	supplierId,
	startsAt: "2026-10-08T10:00:00Z",
	endsAt: "2026-10-08T11:00:00Z",
	location: "Test airport",
	timezone: "Europe/Paris",
	passengers: 2,
	currency: "EUR",
	costCents: 10000,
	sellCents: 14000,
	supplierTerms: "Non-refundable",
	clientTerms: "Refundable",
	availability: "Offered",
	confirmationReference: "",
	clientNotes: "Meet at arrivals",
	supplierNotes: "INTERNAL-NEGOTIATION-SECRET",
};

beforeAll(async () => {
	await db.organization.upsert({
		where: { id: "workspace" },
		create: {
			id: "workspace",
			name: "Test",
			slug: "test",
			createdAt: new Date(),
		},
		update: {},
	});
	for (const [id, role] of [
		[owner, "owner"],
		[member, "member"],
	] as const) {
		await db.user.create({
			data: { id, name: id, email: `${id}@fixture.example` },
		});
		await db.member.create({
			data: {
				id,
				userId: id,
				organizationId: "workspace",
				role,
				createdAt: new Date(),
			},
		});
	}
	await db.contact.create({
		data: { id: profileId, firstName: "Fixture", lastName: "Guest" },
	});
	await db.clientProfile.create({
		data: { id: profileId, contactId: profileId },
	});
	await db.company.create({
		data: { id: supplierId, name: "Fixture Supplier" },
	});
	await db.supplierProfile.create({
		data: {
			id: supplierId,
			companyId: supplierId,
			contactName: "Agent",
			email: "supplier@fixture.example",
			location: "Paris",
			categories: ["transfer"],
		},
	});
	await db.conciergeCase.create({
		data: {
			id: caseId,
			reference: run,
			title: "Integration fixture",
			clientId: profileId,
			destination: "Paris",
			startsAt: "2026-10-08T10:00:00Z",
			endsAt: "2026-10-10T10:00:00Z",
			assigneeId: owner,
		},
	});
});

afterAll(async () => {
	await db.conciergeIntake.deleteMany({ where: { caseId } });
	await db.conciergeActivity.deleteMany({
		where: { OR: [{ caseId }, { actorId: { in: [owner, member] } }] },
	});
	await db.conciergeCase.delete({ where: { id: caseId } });
	await db.clientProfile.delete({ where: { id: profileId } });
	await db.contact.delete({ where: { id: profileId } });
	await db.supplierProfile.delete({ where: { id: supplierId } });
	await db.company.delete({ where: { id: supplierId } });
	await db.user.deleteMany({ where: { id: { in: [owner, member] } } });
	await db.$disconnect();
});

describe("concierge boundaries", () => {
	test("rejects arbitrary JSON, unsupported currencies and negative amounts", () => {
		expect(
			conciergeCommand.safeParse({
				type: "upsertService",
				service: { ...service, injected: true },
			}).success,
		).toBe(false);
		expect(
			conciergeCommand.safeParse({
				type: "upsertService",
				service: { ...service, currency: "USD" },
			}).success,
		).toBe(false);
		expect(
			conciergeCommand.safeParse({
				type: "upsertService",
				service: { ...service, sellCents: -1 },
			}).success,
		).toBe(false);
	});

	test("excludes cancelled services and does not invent missing costs", () => {
		expect(
			totalsOf(
				[
					{ status: "offered", costCents: 10000, sellCents: 14000 },
					{ status: "cancelled", costCents: 90000, sellCents: 95000 },
				],
				true,
			).marginCents,
		).toBe(4000);
		expect(
			totalsOf([{ status: "offered", costCents: null, sellCents: 14000 }], true)
				.marginCents,
		).toBeNull();
		expect(
			totalsOf(
				[{ status: "offered", costCents: 10000, sellCents: 14000 }],
				false,
			).costCents,
		).toBeNull();
	});

	test("client briefs whitelist operational content", () => {
		const content = composeBrief({
			reference: "TEST",
			title: "Journey",
			clientName: "Guest",
			audience: "client",
			services: [
				{ ...service, startsAt: new Date(service.startsAt), endsAt: null },
			],
		});
		expect(content).toContain("Meet at arrivals");
		expect(content).not.toContain("INTERNAL-NEGOTIATION-SECRET");
		expect(content).not.toContain("10000");
		expect(content).not.toContain("Non-refundable");
	});

	test("requires membership", async () => {
		await expect(api.snapshot(`unknown-${run}`)).rejects.toThrow(
			"Workspace membership",
		);
	});

	test("blocks member cost writes without creating a service or audit event", async () => {
		const before = await db.conciergeActivity.count({ where: { caseId } });
		await expect(
			api.command(member, { type: "upsertService", service }),
		).rejects.toThrow("supplier costs");
		expect(await db.serviceSegment.count({ where: { caseId } })).toBe(0);
		expect(await db.conciergeActivity.count({ where: { caseId } })).toBe(
			before,
		);
	});

	test("requires explicit confirmation evidence and valid chronology", async () => {
		await expect(
			api.command(owner, {
				type: "upsertService",
				service: { ...service, status: "confirmed" },
			}),
		).rejects.toThrow("confirmation reference");
		await expect(
			api.command(owner, {
				type: "upsertService",
				service: { ...service, endsAt: "2026-10-07T10:00:00Z" },
			}),
		).rejects.toThrow("End time");
		await expect(
			api.command(owner, {
				type: "upsertService",
				service: { ...service, timezone: "Mars/Olympus" },
			}),
		).rejects.toThrow("timezone");
	});

	test("persists a service with audit and redacts member financials", async () => {
		const created = await api.command(owner, {
			type: "upsertService",
			service,
		});
		const ownerView = await api.snapshot(owner);
		const memberView = await api.snapshot(member);
		expect(
			ownerView.services.find((row) => row.id === created.id)?.marginCents,
		).toBe(4000);
		expect(
			memberView.services.find((row) => row.id === created.id)?.costCents,
		).toBeNull();
		expect(
			memberView.cases.find((row) => row.id === caseId)?.totals.marginCents,
		).toBeNull();
		expect(
			memberView.clients.find((row) => row.id === profileId)
				?.defaultMarkupPercent,
		).toBeNull();
		expect(ownerView.cases.find((row) => row.id === caseId)?.alerts).toContain(
			"Supplier and client terms differ. Review exposure.",
		);
		expect(
			await db.conciergeActivity.count({
				where: { caseId, kind: "upsertService" },
			}),
		).toBe(1);
	});

	test("blocks case confirmation while services remain unconfirmed", async () => {
		await expect(
			api.command(owner, { type: "updateCase", caseId, status: "confirmed" }),
		).rejects.toThrow("All active services");
	});

	test("concurrent intake approvals create one service and one audit event", async () => {
		const intake = await api.command(owner, {
			type: "captureIntake",
			channel: "manual",
			sender: "Guest",
			rawText: "Please add an airport transfer.",
			caseId,
		});
		const input = {
			type: "approveIntake" as const,
			intakeId: intake.id,
			caseId,
			note: "Human reviewed dates and supplier.",
			service: { ...service, title: "Intake transfer" },
		};
		const results = await Promise.all([
			api.command(owner, input),
			api.command(owner, input),
		]);
		expect(results[0]?.id).toBe(results[1]?.id);
		expect(
			await db.serviceSegment.count({
				where: { caseId, title: "Intake transfer" },
			}),
		).toBe(1);
		expect(
			await db.conciergeActivity.count({
				where: { caseId, kind: "approveIntake" },
			}),
		).toBe(1);
	});

	test("intake approval cannot confirm a service", async () => {
		const intake = await api.command(owner, {
			type: "captureIntake",
			channel: "email",
			sender: "Agent",
			rawText: "Confirmed subject to review",
			caseId,
		});
		await expect(
			api.command(owner, {
				type: "approveIntake",
				intakeId: intake.id,
				caseId,
				note: "Reviewed",
				service: {
					...service,
					status: "confirmed",
					confirmationReference: "UNTRUSTED",
				},
			}),
		).rejects.toThrow("cannot confirm");
		expect(
			(await db.conciergeIntake.findUniqueOrThrow({ where: { id: intake.id } }))
				.status,
		).toBe("pending");
	});

	test("brief versions increment atomically and internal briefs stay hidden from members", async () => {
		const results = await Promise.all([
			api.command(owner, { type: "createBrief", caseId, audience: "client" }),
			api.command(owner, { type: "createBrief", caseId, audience: "client" }),
		]);
		const rows = await db.conciergeDocument.findMany({
			where: { id: { in: results.map((row) => row.id) } },
			orderBy: { version: "asc" },
		});
		expect(rows.map((row) => row.version)).toEqual([1, 2]);
		expect(rows[0]?.content).not.toContain("INTERNAL-NEGOTIATION-SECRET");
		const internal = await api.command(owner, {
			type: "createBrief",
			caseId,
			audience: "internal",
		});
		expect(
			(await api.snapshot(member)).documents.some(
				(row) => row.id === internal.id,
			),
		).toBe(false);
		await expect(
			api.command(member, {
				type: "createBrief",
				caseId,
				audience: "internal",
			}),
		).rejects.toThrow("owner or admin");
	});
	test("client briefs have Markdown hierarchy and end times", () => {
		const content = composeBrief({
			reference: "TEST",
			title: "Journey",
			clientName: "Guest",
			audience: "client",
			services: [
				{
					...service,
					startsAt: new Date(service.startsAt),
					endsAt: new Date("2026-10-08T11:00:00Z"),
				},
			],
		});
		expect(content).toContain("# Journey");
		expect(content).toContain("## Itinerary");
		expect(content).toContain("### Test transfer");
		expect(content).toContain("- End: 8 October 2026 at 13:00");
		expect(content).not.toContain("INTERNAL-NEGOTIATION-SECRET");
	});

	test("only owner or admin can share client briefs and tokens remain hashed", async () => {
		const document = await api.command(owner, {
			type: "createBrief",
			caseId,
			audience: "client",
		});
		await expect(
			api.command(member, {
				type: "createBriefShare",
				documentId: document.id,
				expiresInDays: 7,
			}),
		).rejects.toThrow("owner or admin");
		const link = await api.command(owner, {
			type: "createBriefShare",
			documentId: document.id,
			expiresInDays: 7,
		});
		expect(link.shareToken).toHaveLength(43);
		const stored = await db.conciergeBriefShare.findFirstOrThrow({
			where: { documentId: document.id, revokedAt: null },
		});
		expect(stored.tokenHash).not.toBe(link.shareToken);
		expect(stored.tokenHash).toHaveLength(64);
		const brief = await api.publicBrief(link.shareToken ?? "");
		expect(Object.keys(brief).sort()).toEqual([
			"content",
			"expiresAt",
			"title",
		]);
		expect(brief.content).not.toContain("INTERNAL-NEGOTIATION-SECRET");
		expect(brief.content).not.toContain("10000");
		expect(
			await db.conciergeActivity.count({
				where: { caseId, body: { contains: link.shareToken } },
			}),
		).toBe(0);
	});

	test("expired, revoked and replaced links cannot read a brief", async () => {
		const document = await api.command(owner, {
			type: "createBrief",
			caseId,
			audience: "client",
		});
		const first = await api.command(owner, {
			type: "createBriefShare",
			documentId: document.id,
			expiresInDays: 1,
		});
		const second = await api.command(owner, {
			type: "createBriefShare",
			documentId: document.id,
			expiresInDays: 1,
		});
		await expect(api.publicBrief(first.shareToken ?? "")).rejects.toThrow(
			"unavailable or expired",
		);
		await expect(
			api.publicBrief(second.shareToken ?? ""),
		).resolves.toHaveProperty("content");
		await db.conciergeBriefShare.updateMany({
			where: { documentId: document.id, revokedAt: null },
			data: { expiresAt: new Date("2020-01-01T00:00:00Z") },
		});
		await expect(api.publicBrief(second.shareToken ?? "")).rejects.toThrow(
			"unavailable or expired",
		);
		const third = await api.command(owner, {
			type: "createBriefShare",
			documentId: document.id,
			expiresInDays: 1,
		});
		await expect(
			api.command(member, {
				type: "revokeBriefShare",
				documentId: document.id,
			}),
		).rejects.toThrow("owner or admin");
		await api.command(owner, {
			type: "revokeBriefShare",
			documentId: document.id,
		});
		await expect(api.publicBrief(third.shareToken ?? "")).rejects.toThrow(
			"unavailable or expired",
		);
		await expect(api.publicBrief("x".repeat(43))).rejects.toThrow(
			"unavailable or expired",
		);
	});

	test("internal and supplier briefs cannot receive public links", async () => {
		for (const audience of ["internal", "supplier"] as const) {
			const document = await api.command(owner, {
				type: "createBrief",
				caseId,
				audience,
				supplierId,
			});
			await expect(
				api.command(owner, {
					type: "createBriefShare",
					documentId: document.id,
					expiresInDays: 7,
				}),
			).rejects.toThrow("client brief");
			expect(
				await db.conciergeBriefShare.count({
					where: { documentId: document.id },
				}),
			).toBe(0);
		}
	});
});
