import "@crm/env/load";
import { db } from "@crm/db";
import { extractConciergeIntake } from "../agent/lib/concierge-intake";
import { conciergeGenerator } from "../agent/lib/concierge-model";
import { processConciergeQueue } from "../agent/lib/concierge-queue";
import { conciergeIntakeStore } from "../agent/lib/concierge-store";

try {
	const generate = conciergeGenerator(process.env.AI_GATEWAY_API_KEY);
	const result = await processConciergeQueue(conciergeIntakeStore, (source) =>
		extractConciergeIntake(source, generate),
	);
	console.log(JSON.stringify(result));
} catch {
	console.error(
		"The concierge intake worker cannot finish. Check the database connection and migrations.",
	);
	process.exitCode = 1;
} finally {
	await db.$disconnect();
}
