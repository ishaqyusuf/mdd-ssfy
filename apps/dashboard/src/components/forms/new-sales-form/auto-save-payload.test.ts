import { describe, expect, it } from "bun:test";
import {
	hasNewerSalesFormPayload,
	rebaseQueuedSalesFormPayload,
} from "./auto-save-payload";
import type { NewSalesFormSaveDraftInput } from "./schema";

describe("new sales form queued autosave payload", () => {
	it("rebases a queued new-draft edit onto the first created order", () => {
		const queued: NewSalesFormSaveDraftInput = {
			type: "order" as const,
			salesId: null,
			slug: null,
			version: "new-autosave-session-1",
			autosave: true,
			meta: { po: "AUTOSAVE-B" },
			lineItems: [],
			extraCosts: [],
			summary: { subTotal: 0, taxRate: 0, taxTotal: 0, grandTotal: 0 },
		};

		const rebased = rebaseQueuedSalesFormPayload(queued, {
			salesId: 42,
			slug: "order-00042aa",
			version: "saved-version-1",
		});

		expect(rebased).toMatchObject({
			salesId: 42,
			slug: "order-00042aa",
			version: "saved-version-1",
			meta: { po: "AUTOSAVE-B" },
		});
	});

	it("detects a newer edit without treating saved identity changes as edits", () => {
		const saved: NewSalesFormSaveDraftInput = {
			type: "order" as const,
			salesId: null,
			slug: null,
			version: "new-autosave-session-1",
			autosave: true,
			meta: { po: "AUTOSAVE-A" },
			lineItems: [],
			extraCosts: [],
			summary: {
				subTotal: 0,
				taxRate: 0,
				taxTotal: 0,
				grandTotal: 0,
			},
		};

		expect(
			hasNewerSalesFormPayload(
				{
					...saved,
					salesId: 42,
					slug: "order-00042aa",
					version: "v2",
				},
				saved,
			),
		).toBe(false);
		expect(
			hasNewerSalesFormPayload({ ...saved, meta: { po: "AUTOSAVE-B" } }, saved),
		).toBe(true);
	});
});
