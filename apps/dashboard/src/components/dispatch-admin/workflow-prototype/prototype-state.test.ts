import { describe, expect, test } from "bun:test";

import {
	getPrototypeScenarioState,
	initialPrototypeState,
	prototypeWorkflowReducer,
} from "./prototype-state";

describe("fulfillment workflow prototype", () => {
	test("keeps order, dispatch, assignment, and exception state distinct", () => {
		const blocked = getPrototypeScenarioState("blocked");

		expect(blocked.orderStatus).toBe("Packing");
		expect(blocked.dispatchStatus).toBe("Packing blocked");
		expect(blocked.assignedTo).toBe("Marcus Reed");
		expect(blocked.assistance).toBe("waiting");
		expect(blocked.backOrder).toBe(false);
	});

	test("creates a back order only after a partial dispatch is approved", () => {
		const blocked = getPrototypeScenarioState("blocked");
		const delivered = getPrototypeScenarioState("backorder");

		expect(blocked.backOrder).toBe(false);
		expect(delivered.backOrder).toBe(true);
		expect(delivered.dispatchStatus).toBe("Delivered");
		expect(delivered.orderStatus).toBe("Partially fulfilled");
		expect(delivered.delivered).toBe(8);
	});

	test("distinguishes a delivered dispatch from a fulfilled order", () => {
		const fulfilled = getPrototypeScenarioState("fulfilled");

		expect(fulfilled.dispatchStatus).toBe("Delivered");
		expect(fulfilled.orderStatus).toBe("Fulfilled");
		expect(fulfilled.delivered).toBe(fulfilled.ordered);
	});

	test("deduplicates repeated proof submission requests", () => {
		const before = getPrototypeScenarioState("retry");
		const event = { type: "submit-proof" as const, requestId: "proof-retry-001" };
		const submitted = prototypeWorkflowReducer(before, event);
		const duplicate = prototypeWorkflowReducer(submitted, event);

		expect(duplicate).toBe(submitted);
		expect(duplicate.history.filter((entry) => entry === "Delivery proof submitted")).toHaveLength(1);
	});

	test("replays the duplicate-submit review scenario without a second event", () => {
		const duplicate = getPrototypeScenarioState("duplicate");

		expect(duplicate.lastRequestId).toBe("proof-duplicate-001");
		expect(duplicate.dispatchStatus).toBe("Delivered");
		expect(duplicate.history.filter((entry) => entry === "Delivery proof submitted")).toHaveLength(1);
	});

	test("clears stale state only when the assignment is refreshed", () => {
		const stale = prototypeWorkflowReducer(initialPrototypeState, { type: "mark-stale" });
		const reassigned = prototypeWorkflowReducer(stale, { type: "reassign", driver: "Elena Brooks" });

		expect(stale.stale).toBe(true);
		expect(reassigned.stale).toBe(false);
		expect(reassigned.assignedTo).toBe("Elena Brooks");
	});
});
