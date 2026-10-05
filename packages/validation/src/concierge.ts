import { z } from "zod";

export const caseStatus = z.enum([
	"new",
	"planning",
	"awaiting_client",
	"confirmed",
	"in_progress",
	"completed",
	"cancelled",
]);
export const serviceStatus = z.enum([
	"requested",
	"sourcing",
	"offered",
	"awaiting_confirmation",
	"confirmed",
	"completed",
	"cancelled",
]);
export const serviceCategory = z.enum([
	"flight",
	"transfer",
	"villa",
	"hotel",
	"dining",
	"experience",
	"yacht",
	"other",
]);
export const priority = z.enum(["normal", "high", "urgent"]);
const id = z.string().trim().min(1).max(120);
const text = z.string().trim().max(12000);
const date = z.iso.datetime({ offset: true });
const cents = z.number().int().min(0).max(1000000000);
export const serviceInput = z
	.object({
		id: id.optional(),
		caseId: id,
		title: text.min(1).max(200),
		category: serviceCategory,
		status: serviceStatus,
		supplierId: id.nullable(),
		startsAt: date,
		endsAt: date.nullable(),
		location: text.max(300),
		timezone: z.string().min(1).max(80),
		passengers: z.number().int().min(1).max(1000),
		currency: z.literal("EUR"),
		costCents: cents.optional(),
		sellCents: cents,
		supplierTerms: text,
		clientTerms: text,
		availability: text.max(1000),
		confirmationReference: text.max(300),
		clientNotes: text,
		supplierNotes: text,
	})
	.strict();
export const intakeEvidence = z
	.object({
		field: z.enum([
			"title",
			"summary",
			"category",
			"requestedStart",
			"requestedEnd",
			"location",
			"serviceUpdates",
		]),
		quote: z.string().min(1).max(2000),
		start: z.number().int().min(0),
		end: z.number().int().min(1),
	})
	.strict();
export const intakeProposal = z
	.object({
		title: text.max(200),
		summary: text,
		category: serviceCategory.nullable(),
		requestedStart: date.nullable(),
		requestedEnd: date.nullable(),
		location: text.max(300),
		missingFields: z.array(z.string().max(200)).max(20),
		evidence: z.array(intakeEvidence).max(40),
		serviceUpdates: z.array(z.string().max(1000)).max(20),
	})
	.strict();
export const conciergeCommand = z.discriminatedUnion("type", [
	z
		.object({
			type: z.literal("createBriefShare"),
			documentId: id,
			expiresInDays: z.number().int().min(1).max(30),
		})
		.strict(),
	z.object({ type: z.literal("revokeBriefShare"), documentId: id }).strict(),
	z
		.object({
			type: z.literal("createClient"),
			firstName: text.min(1).max(100),
			lastName: text.max(100),
			email: z.email(),
			phone: text.max(80),
			tier: text.min(1).max(100),
			preferences: text,
			dietary: text,
			notes: text,
			defaultMarkupPercent: z.number().int().min(0).max(300).optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal("createSupplier"),
			name: text.min(1).max(200),
			contactName: text.max(200),
			email: z.email(),
			phone: text.max(80),
			location: text.max(300),
			categories: z.array(serviceCategory).min(1),
			notes: text,
			cancellationTerms: text,
			paymentTerms: text,
		})
		.strict(),
	z
		.object({
			type: z.literal("createCase"),
			title: text.min(1).max(200),
			clientId: id,
			destination: text.max(300),
			startsAt: date,
			endsAt: date,
			priority,
			assigneeId: id.nullable(),
			notes: text,
		})
		.strict(),
	z
		.object({
			type: z.literal("updateCase"),
			caseId: id,
			status: caseStatus.optional(),
			assigneeId: id.nullable().optional(),
			priority: priority.optional(),
			notes: text.optional(),
		})
		.strict(),
	z
		.object({ type: z.literal("upsertService"), service: serviceInput })
		.strict(),
	z
		.object({
			type: z.literal("createTask"),
			caseId: id,
			title: text.min(1).max(200),
			assigneeId: id.nullable(),
			dueAt: date,
			priority,
		})
		.strict(),
	z
		.object({
			type: z.literal("completeTask"),
			taskId: id,
			completed: z.boolean(),
		})
		.strict(),
	z
		.object({ type: z.literal("addNote"), caseId: id, body: text.min(1) })
		.strict(),
	z
		.object({
			type: z.literal("captureIntake"),
			channel: z.enum(["email", "whatsapp", "phone", "manual"]),
			sender: text.min(1).max(200),
			rawText: text.min(1),
			caseId: id.nullable(),
		})
		.strict(),
	z
		.object({
			type: z.literal("approveIntake"),
			intakeId: id,
			caseId: id,
			note: text.min(1),
			service: serviceInput.optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal("dismissIntake"),
			intakeId: id,
			reason: text.min(1),
		})
		.strict(),
	z
		.object({
			type: z.literal("createBrief"),
			caseId: id,
			audience: z.enum(["client", "supplier", "internal"]),
			supplierId: id.optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal("updateSupplier"),
			supplierId: id,
			contactName: text.max(200),
			email: z.email(),
			phone: text.max(80),
			location: text.max(300),
			categories: z.array(serviceCategory).min(1),
			notes: text,
			cancellationTerms: text,
			paymentTerms: text,
		})
		.strict(),
	z
		.object({
			type: z.literal("updateClient"),
			clientId: id,
			preferences: text,
			dietary: text,
			notes: text,
			defaultMarkupPercent: z.number().int().min(0).max(300).optional(),
		})
		.strict(),
]);
const totals = z.object({
	sellCents: z.number(),
	costCents: z.number().nullable(),
	marginCents: z.number().nullable(),
	marginPercent: z.number().nullable(),
	currency: z.literal("EUR"),
});
export const conciergeSnapshot = z.object({
	asOf: date,
	permissions: z.object({
		role: z.string(),
		canViewFinancials: z.boolean(),
		canManageFinancials: z.boolean(),
		userId: id,
	}),
	team: z.array(
		z.object({ id, name: z.string(), email: z.string(), role: z.string() }),
	),
	clients: z.array(
		z.object({
			id,
			contactId: id,
			name: z.string(),
			email: z.string().nullable(),
			phone: z.string().nullable(),
			tier: z.string(),
			preferences: z.string(),
			dietary: z.string(),
			notes: z.string(),
			defaultMarkupPercent: z.number().nullable(),
			caseCount: z.number(),
		}),
	),
	suppliers: z.array(
		z.object({
			id,
			companyId: id,
			name: z.string(),
			contactName: z.string(),
			email: z.string(),
			phone: z.string(),
			location: z.string(),
			categories: z.array(serviceCategory),
			notes: z.string(),
			cancellationTerms: z.string(),
			paymentTerms: z.string(),
			active: z.boolean(),
		}),
	),
	cases: z.array(
		z.object({
			id,
			reference: z.string(),
			title: z.string(),
			clientId: id,
			clientName: z.string(),
			destination: z.string(),
			startsAt: date,
			endsAt: date,
			status: caseStatus,
			priority,
			assigneeId: id.nullable(),
			assigneeName: z.string().nullable(),
			notes: z.string(),
			updatedAt: date,
			serviceCount: z.number(),
			confirmedCount: z.number(),
			openTaskCount: z.number(),
			alerts: z.array(z.string()),
			totals,
		}),
	),
	services: z.array(
		serviceInput
			.extend({
				id,
				costCents: z.number().nullable(),
				confirmationBy: z.string().nullable(),
				confirmedAt: date.nullable(),
				termsMismatch: z.boolean(),
				marginCents: z.number().nullable(),
				updatedAt: date,
			})
			.strip(),
	),
	tasks: z.array(
		z.object({
			id,
			caseId: id,
			title: z.string(),
			assigneeId: id.nullable(),
			assigneeName: z.string().nullable(),
			dueAt: date,
			priority,
			completedAt: date.nullable(),
			overdue: z.boolean(),
		}),
	),
	inbox: z.array(
		z.object({
			id,
			channel: z.string(),
			sender: z.string(),
			rawText: z.string(),
			caseId: id.nullable(),
			status: z.enum(["pending", "proposed", "approved", "dismissed"]),
			proposal: intakeProposal.nullable(),
			reviewNote: z.string().nullable(),
			extractionStatus: z.string(),
			extractionError: z.string().nullable(),
			createdAt: date,
			reviewedAt: date.nullable(),
		}),
	),
	documents: z.array(
		z.object({
			id,
			caseId: id,
			title: z.string(),
			audience: z.enum(["client", "supplier", "internal"]),
			supplierId: id.nullable(),
			content: z.string(),
			version: z.number(),
			createdAt: date,
		}),
	),
	activity: z.array(
		z.object({
			id,
			caseId: id.nullable(),
			actorName: z.string(),
			kind: z.string(),
			body: z.string(),
			createdAt: date,
		}),
	),
	stats: z.object({
		activeCases: z.number(),
		arrivingToday: z.number(),
		pendingConfirmations: z.number(),
		openTasks: z.number(),
		pendingIntake: z.number(),
		totals,
	}),
});
export const conciergeCommandResult = z.object({
	id,
	caseId: id.nullable(),
	shareToken: z.string().optional(),
	expiresAt: date.optional(),
});
export const conciergeBriefShareInput = z
	.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
	.strict();
export const conciergePublicBrief = z.object({
	title: z.string(),
	content: z.string(),
	expiresAt: date,
});
export type ConciergeCommandResult = z.infer<typeof conciergeCommandResult>;
export type ConciergeCommand = z.infer<typeof conciergeCommand>;
export type ConciergeSnapshot = z.infer<typeof conciergeSnapshot>;
export type ConciergeServiceInput = z.infer<typeof serviceInput>;
export type IntakeProposal = z.infer<typeof intakeProposal>;
