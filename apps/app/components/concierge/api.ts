import {
	type ConciergeCommand,
	conciergeCommandResult,
	conciergeSnapshot,
} from "@crm/validation/concierge";
import { z } from "zod";

const envelope = z.object({
	result: z.object({ data: z.unknown() }).optional(),
	error: z.object({ message: z.string() }).optional(),
});
export async function sendCommand(command: ConciergeCommand) {
	const response = await fetch("/api/trpc/concierge.command", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(command),
	});
	const payload = envelope.parse(await response.json());
	if (!response.ok || payload.error)
		throw new Error(
			payload.error?.message ||
				"The update could not be saved. Please try again.",
		);
	return conciergeCommandResult.parse(payload.result?.data);
}
export async function fetchSnapshot() {
	const response = await fetch("/api/trpc/concierge.snapshot");
	const payload = envelope.parse(await response.json());
	if (!response.ok || payload.error)
		throw new Error(
			payload.error?.message || "The workspace could not be loaded.",
		);
	return conciergeSnapshot.parse(payload.result?.data);
}
