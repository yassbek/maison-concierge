const DAY_MS = 24 * 60 * 60 * 1000;

export const CONCIERGE = {
	share: { tokenBytes: 32, dayMs: DAY_MS },
	snapshot: { maxRecords: 500, maxActivity: 100 },
	money: { currency: "EUR", percentScale: 100 },
} as const;
