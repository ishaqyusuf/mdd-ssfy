import { describe, expect, it } from "bun:test";
import { createRowActivityStore } from "./table-row-activity";

describe("row activity lifecycle", () => {
	it("captures synchronously and ignores an old completion after a retry", () => {
		const store = createRowActivityStore();
		const captured: string[] = [];
		store.onBegin((activity) => captured.push(activity.operationId));
		const input = {
			ownerId: "a",
			tableId: "orders",
			entityId: 42,
			label: "Reviewing",
		};
		const first = store.begin(input);
		expect(captured).toEqual([first.operationId]);
		store.settle(first, { phase: "error", label: "Failed" });
		const retry = store.begin(input);
		store.settle(first, { phase: "success", label: "Reviewed" });
		expect(store.get(retry)?.phase).toBe("processing");
		store.settle(retry, { phase: "success", label: "Reviewed" });
		expect(store.get(retry)?.phase).toBe("success");
	});
});

it("does not recreate activity after logout or let cleanup erase a newer operation", () => {
	const store = createRowActivityStore();
	const input = {
		ownerId: "a",
		tableId: "orders",
		entityId: 42,
		label: "Reviewing",
	};
	const old = store.begin(input);
	const latest = store.begin(input);
	store.clear(old);
	expect(store.get(latest)?.phase).toBe("processing");
	store.clearOwner("a");
	store.settle(latest, { phase: "success", label: "Reviewed" });
	expect(store.getSnapshot().size).toBe(0);
});
