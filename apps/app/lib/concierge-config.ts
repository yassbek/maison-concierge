const MINUTE_MS = 60_000;
export const CONCIERGE_UI = {
	snapshotRefreshMs: 30_000,
	localSessionMs: 8 * 60 * MINUTE_MS,
	shareDays: 7,
	previewSecretMinLength: 32,
	previewSecretMaxLength: 1024,
} as const;
