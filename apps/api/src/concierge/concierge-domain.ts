import type { ConciergeServiceInput } from "@crm/validation/concierge";
import { BadRequestException } from "@nestjs/common";
import { CONCIERGE } from "./concierge-config";

export function totalsOf(
	services: { status: string; costCents: number | null; sellCents: number }[],
	financials: boolean,
) {
	const live = services.filter((service) => service.status !== "cancelled");
	const sellCents = live.reduce((sum, service) => sum + service.sellCents, 0);
	const costCents = live.some((service) => service.costCents === null)
		? null
		: live.reduce((sum, service) => sum + (service.costCents ?? 0), 0);
	const marginCents = costCents === null ? null : sellCents - costCents;
	return {
		sellCents,
		costCents: financials ? costCents : null,
		marginCents: financials ? marginCents : null,
		marginPercent:
			financials && marginCents !== null && sellCents > 0
				? Math.round(
						(marginCents / sellCents) *
							CONCIERGE.money.percentScale *
							CONCIERGE.money.percentScale,
					) / CONCIERGE.money.percentScale
				: null,
		currency: CONCIERGE.money.currency,
	};
}

export function termsMismatch(service: {
	supplierTerms: string;
	clientTerms: string;
	status: string;
}) {
	return (
		service.status !== "cancelled" &&
		service.supplierTerms.trim() !== service.clientTerms.trim()
	);
}

export function validateService(service: ConciergeServiceInput) {
	try {
		new Intl.DateTimeFormat("en", { timeZone: service.timezone });
	} catch {
		throw new BadRequestException("Select a valid timezone.");
	}
	if (
		(service.status === "confirmed" || service.status === "completed") &&
		(!service.supplierId || !service.confirmationReference.trim())
	) {
		throw new BadRequestException(
			"Confirmed services need a supplier and a confirmation reference.",
		);
	}
	if (service.endsAt && new Date(service.endsAt) < new Date(service.startsAt)) {
		throw new BadRequestException("End time must follow start time.");
	}
}

type BriefService = {
	title: string;
	category: string;
	status: string;
	location: string;
	timezone: string;
	startsAt: Date;
	endsAt: Date | null;
	passengers: number;
	clientNotes: string;
	supplierNotes: string;
	confirmationReference: string;
	clientTerms: string;
	supplierTerms: string;
};

export function composeBrief(input: {
	reference: string;
	title: string;
	clientName: string;
	audience: "client" | "supplier" | "internal";
	services: BriefService[];
}) {
	const label =
		input.audience === "client"
			? "Your travel brief"
			: input.audience === "supplier"
				? "Supplier operations brief"
				: "Internal operations brief";
	const lines = [
		"MAISON",
		"",
		`# ${markdownText(input.title)}`,
		"",
		label,
		"",
		`Reference: ${markdownText(input.reference)}`,
		"",
		`Guest: ${markdownText(input.clientName)}`,
		"",
		"## Itinerary",
		"",
	];
	for (const service of input.services) {
		const format = (value: Date) =>
			value.toLocaleString("en-GB", {
				timeZone: service.timezone,
				dateStyle: "long",
				timeStyle: "short",
			});
		lines.push(
			`### ${markdownText(service.title)}`,
			"",
			`- Start: ${format(service.startsAt)}`,
			...(service.endsAt ? [`- End: ${format(service.endsAt)}`] : []),
			`- Timezone: ${markdownText(service.timezone)}`,
			`- Location: ${markdownText(service.location)}`,
			`- Guests: ${service.passengers}`,
			`- Status: ${service.status.replaceAll("_", " ")}`,
		);
		if (service.confirmationReference)
			lines.push(
				`- Confirmation: ${markdownText(service.confirmationReference)}`,
			);
		lines.push("");
		if (input.audience === "client") {
			if (service.clientNotes)
				lines.push(markdownText(service.clientNotes), "");
			if (service.clientTerms)
				lines.push(`Terms: ${markdownText(service.clientTerms)}`, "");
		} else {
			if (service.supplierNotes)
				lines.push(markdownText(service.supplierNotes), "");
			if (service.supplierTerms)
				lines.push(
					`Supplier terms: ${markdownText(service.supplierTerms)}`,
					"",
				);
		}
	}
	lines.push(
		"## Before you travel",
		"",
		"Unconfirmed services remain subject to written supplier confirmation.",
		"",
		"Prepared by Maison.",
	);
	return lines.join("\n");
}

function markdownText(value: string) {
	return value.replace(/[\\`*_{}[\]()#+<>|]/g, "\\$&");
}
