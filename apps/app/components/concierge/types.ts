import type {
	ConciergeCommand,
	ConciergeCommandResult,
	ConciergeServiceInput,
	ConciergeSnapshot,
} from "@crm/validation/concierge";
export type Snapshot = ConciergeSnapshot;
export type Case = Snapshot["cases"][number];
export type Service = Snapshot["services"][number];
export type Client = Snapshot["clients"][number];
export type Supplier = Snapshot["suppliers"][number];
export type Intake = Snapshot["inbox"][number];
export type Document = Snapshot["documents"][number];
export type Command = ConciergeCommand;
export type ServiceInput = ConciergeServiceInput;
export type Execute = (command: Command) => Promise<ConciergeCommandResult>;
export const statusLabels: Record<string, string> = {
	new: "New request",
	planning: "In planning",
	awaiting_client: "Awaiting client",
	confirmed: "Confirmed",
	in_progress: "In progress",
	completed: "Completed",
	cancelled: "Cancelled",
	requested: "Requested",
	sourcing: "Sourcing",
	offered: "Offer received",
	awaiting_confirmation: "Awaiting confirmation",
	pending: "Needs review",
	proposed: "Ready to review",
	approved: "Reviewed",
	dismissed: "Dismissed",
};
export function tone(status: string) {
	return ["confirmed", "completed", "approved"].includes(status)
		? "green"
		: [
					"awaiting_client",
					"awaiting_confirmation",
					"pending",
					"proposed",
					"offered",
				].includes(status)
			? "amber"
			: status === "cancelled"
				? "red"
				: "neutral";
}
export function money(cents: number | null | undefined) {
	return cents == null
		? "Not recorded"
		: new Intl.NumberFormat("en-GB", {
				style: "currency",
				currency: "EUR",
				minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
				maximumFractionDigits: 2,
			}).format(cents / 100);
}
export function date(value: string, options?: Intl.DateTimeFormatOptions) {
	return new Intl.DateTimeFormat(
		"en-GB",
		options || { day: "numeric", month: "short" },
	).format(new Date(value));
}
export function time(value: string, timezone?: string) {
	return new Intl.DateTimeFormat("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: timezone,
	}).format(new Date(value));
}
export function imageFor(destination: string) {
	return /marr|moroc|atlas|casa/i.test(destination)
		? "/concierge/marrakech-original.png"
		: "/concierge/riviera.jpg";
}
