import {
	type IntakeProposal,
	intakeEvidence,
	intakeProposal,
} from "@crm/validation/concierge";
import { z } from "zod";
import { CONCIERGE } from "./concierge-config";

export const conciergeSource = z
	.object({
		id: z.string().min(1),
		channel: z.enum(["email", "whatsapp", "phone", "manual"]),
		rawText: z.string().min(1).max(CONCIERGE.intake.maxCharacters),
	})
	.strict();

export type ConciergeSource = z.infer<typeof conciergeSource>;

export const conciergeModelProposal = intakeProposal.extend({
	evidence: z
		.array(intakeEvidence.omit({ start: true, end: true }))
		.max(CONCIERGE.intake.maxEvidenceQuotes),
});

export const conciergeExtraction = z.discriminatedUnion("status", [
	z
		.object({ status: z.literal("proposed"), proposal: intakeProposal })
		.strict(),
	z.object({ status: z.literal("unavailable"), reason: z.string() }).strict(),
	z.object({ status: z.literal("failed"), reason: z.string() }).strict(),
]);

export type ConciergeExtraction = z.infer<typeof conciergeExtraction>;
export type ConciergeGenerator = (source: ConciergeSource) => Promise<unknown>;

export function validateConciergeProposal(
	rawText: string,
	value: unknown,
): IntakeProposal {
	const proposal = intakeProposal.parse(value);
	for (const evidence of proposal.evidence) {
		if (
			evidence.end <= evidence.start ||
			evidence.end > rawText.length ||
			rawText.slice(evidence.start, evidence.end) !== evidence.quote
		) {
			throw new Error("A proposal evidence quote does not match the source.");
		}
	}
	for (const field of [
		"title",
		"summary",
		"category",
		"requestedStart",
		"requestedEnd",
		"location",
	] as const) {
		if (
			proposal[field] &&
			!proposal.evidence.some((evidence) => evidence.field === field)
		) {
			throw new Error(`The proposal field ${field} has no source evidence.`);
		}
	}
	for (const field of ["requestedStart", "requestedEnd"] as const) {
		const date = proposal[field];
		if (
			date &&
			!proposal.evidence.some(
				(evidence) => evidence.field === field && evidence.quote.includes(date),
			)
		) {
			throw new Error(
				"A requested date must appear exactly in source evidence.",
			);
		}
	}
	for (const update of proposal.serviceUpdates) {
		if (
			!update.trim() ||
			!proposal.evidence.some(
				(evidence) =>
					evidence.field === "serviceUpdates" &&
					evidence.quote.includes(update),
			)
		) {
			throw new Error("A service update must quote the source text exactly.");
		}
	}
	if (
		proposal.requestedStart &&
		proposal.requestedEnd &&
		Date.parse(proposal.requestedEnd) < Date.parse(proposal.requestedStart)
	) {
		throw new Error("The requested end precedes the requested start.");
	}
	return proposal;
}

export function parseConciergeModelProposal(
	rawText: string,
	value: unknown,
): IntakeProposal {
	const proposal = conciergeModelProposal.parse(value);
	const evidence = proposal.evidence.map((entry) => {
		const start = rawText.indexOf(entry.quote);
		if (start < 0)
			throw new Error("The model evidence quote is absent from the source.");
		return { ...entry, start, end: start + entry.quote.length };
	});
	return validateConciergeProposal(rawText, { ...proposal, evidence });
}

export async function extractConciergeIntake(
	input: unknown,
	generate: ConciergeGenerator | null,
): Promise<ConciergeExtraction> {
	const source = conciergeSource.safeParse(input);
	if (!source.success) {
		return {
			status: "failed",
			reason:
				"The intake source is invalid or exceeds the intake limit. Review it manually.",
		};
	}
	if (!generate) {
		return {
			status: "unavailable",
			reason:
				"AI extraction is unavailable. Configure AI_GATEWAY_API_KEY or review the source manually.",
		};
	}
	let value: unknown;
	try {
		value = await generate(source.data);
	} catch {
		return {
			status: "failed",
			reason:
				"The extraction model does not return a proposal. Review the source manually.",
		};
	}
	try {
		return {
			status: "proposed",
			proposal: parseConciergeModelProposal(source.data.rawText, value),
		};
	} catch {
		return {
			status: "failed",
			reason:
				"The model proposal fails source validation. Review the source manually.",
		};
	}
}
