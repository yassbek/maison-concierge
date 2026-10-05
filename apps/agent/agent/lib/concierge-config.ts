const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;

export const CONCIERGE = {
	intake: { maxCharacters: 12_000, maxEvidenceQuotes: 40 },
	model: { timeoutMs: 45 * SECOND_MS, maxOutputTokens: 4_000, maxRetries: 0 },
	queue: { batchSize: 5, staleAfterMs: 2 * MINUTE_MS },
} as const;
