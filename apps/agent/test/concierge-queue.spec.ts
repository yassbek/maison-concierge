import { describe, expect, test } from "bun:test";
import type {
	ConciergeExtraction,
	ConciergeSource,
} from "../agent/lib/concierge-intake";
import {
	type ConciergeIntakeStore,
	processConciergeQueue,
} from "../agent/lib/concierge-queue";

const source: ConciergeSource = {
	id: "intake-one",
	channel: "phone",
	rawText: "Request airport pickup.",
};
const unavailable: ConciergeExtraction = {
	status: "unavailable",
	reason: "Model unavailable.",
};

function memoryStore() {
	let state = "pending";
	let reviewed = false;
	const store: ConciergeIntakeStore = {
		async reconcile() {
			return 0;
		},
		async pending() {
			return state === "pending" ? [source] : [];
		},
		async claim() {
			if (state !== "pending" || reviewed) return false;
			state = "processing";
			return true;
		},
		async complete(_source, _startedAt, result) {
			if (state !== "processing" || reviewed) return false;
			state = result.status;
			return true;
		},
	};
	return {
		store,
		review: () => {
			reviewed = true;
		},
		state: () => state,
	};
}

describe("concierge queue ownership", () => {
	test("does not reprocess completed attempts", async () => {
		const memory = memoryStore();
		let calls = 0;
		const extract = async () => {
			calls += 1;
			return unavailable;
		};
		await processConciergeQueue(memory.store, extract);
		await processConciergeQueue(memory.store, extract);
		expect(calls).toBe(1);
	});

	test("concurrent workers execute a claimed source once", async () => {
		const memory = memoryStore();
		let calls = 0;
		const extract = async () => {
			calls += 1;
			return unavailable;
		};
		await Promise.all([
			processConciergeQueue(memory.store, extract),
			processConciergeQueue(memory.store, extract),
		]);
		expect(calls).toBe(1);
	});

	test("does not overwrite human review during extraction", async () => {
		const memory = memoryStore();
		const result = await processConciergeQueue(memory.store, async () => {
			memory.review();
			return unavailable;
		});
		expect(result.skipped).toBe(1);
		expect(result.unavailable).toBe(0);
	});

	test("settles extractor exceptions without exposing message contents", async () => {
		const memory = memoryStore();
		const result = await processConciergeQueue(memory.store, async () => {
			throw new Error("private");
		});
		expect(result.failed).toBe(1);
		expect(memory.state()).toBe("failed");
	});
});
