import { CONCIERGE } from "./concierge-config";
import type { ConciergeExtraction, ConciergeSource } from "./concierge-intake";

export type ConciergeIntakeStore = {
	reconcile: (before: Date) => Promise<number>;
	pending: (limit: number) => Promise<ConciergeSource[]>;
	claim: (source: ConciergeSource, startedAt: Date) => Promise<boolean>;
	complete: (
		source: ConciergeSource,
		startedAt: Date,
		result: ConciergeExtraction,
	) => Promise<boolean>;
};

export async function processConciergeQueue(
	store: ConciergeIntakeStore,
	extract: (source: ConciergeSource) => Promise<ConciergeExtraction>,
	now: () => Date = () => new Date(),
) {
	const retired = await store.reconcile(
		new Date(now().getTime() - CONCIERGE.queue.staleAfterMs),
	);
	const results = {
		scanned: 0,
		proposed: 0,
		unavailable: 0,
		failed: 0,
		skipped: 0,
		retired,
	};
	const sources = await store.pending(CONCIERGE.queue.batchSize);
	for (const source of sources) {
		results.scanned += 1;
		const startedAt = now();
		if (!(await store.claim(source, startedAt))) {
			results.skipped += 1;
			continue;
		}
		let result: ConciergeExtraction;
		try {
			result = await extract(source);
		} catch {
			result = {
				status: "failed",
				reason: "Extraction stops unexpectedly. Review the source manually.",
			};
		}
		if (await store.complete(source, startedAt, result))
			results[result.status] += 1;
		else results.skipped += 1;
	}
	return results;
}
