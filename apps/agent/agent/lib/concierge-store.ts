import { db } from "@crm/db";
import { conciergeSource } from "./concierge-intake";
import type { ConciergeIntakeStore } from "./concierge-queue";

export const conciergeIntakeStore: ConciergeIntakeStore = {
	async reconcile(before) {
		const result = await db.conciergeIntake.updateMany({
			where: {
				status: "pending",
				extractionStatus: "processing",
				extractionStartedAt: { lt: before },
			},
			data: {
				extractionStatus: "failed",
				extractionError:
					"Extraction stops before completion. Review the source manually.",
				extractionCompletedAt: new Date(),
			},
		});
		return result.count;
	},
	async pending(limit) {
		const rows = await db.conciergeIntake.findMany({
			where: { status: "pending", extractionStatus: "pending" },
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
			take: limit,
			select: { id: true, channel: true, rawText: true },
		});
		return rows.map((row) => conciergeSource.parse(row));
	},
	async claim(source, startedAt) {
		const result = await db.conciergeIntake.updateMany({
			where: { ...source, status: "pending", extractionStatus: "pending" },
			data: {
				extractionStatus: "processing",
				extractionStartedAt: startedAt,
				extractionError: null,
			},
		});
		return result.count === 1;
	},
	async complete(source, startedAt, result) {
		const updated = await db.conciergeIntake.updateMany({
			where: {
				...source,
				status: "pending",
				extractionStatus: "processing",
				extractionStartedAt: startedAt,
			},
			data:
				result.status === "proposed"
					? {
							status: "proposed",
							proposal: result.proposal,
							extractionStatus: "proposed",
							extractionError: null,
							extractionCompletedAt: new Date(),
						}
					: {
							extractionStatus: result.status,
							extractionError: result.reason,
							extractionCompletedAt: new Date(),
						},
		});
		return updated.count === 1;
	},
};
