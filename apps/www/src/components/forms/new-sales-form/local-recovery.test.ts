import { describe, expect, it } from "bun:test";
import {
	createPayloadFingerprint,
	createRecoverySnapshot,
	getRecoveryStorageKey,
	parseRecoverySnapshot,
} from "./local-recovery";
import type { NewSalesFormSaveDraftInput } from "./schema";

function createPayload(): NewSalesFormSaveDraftInput {
	return {
		type: "order",
		salesId: 10,
		slug: "ORD-10",
		version: "v1",
		autosave: true,
		meta: {
			customerId: 20,
			paymentMethod: "Credit Card",
		},
		lineItems: [
			{
				uid: "line-1",
				title: "Line",
				description: "",
				qty: 2,
				unitPrice: 15,
				lineTotal: 30,
				meta: {},
				formSteps: [],
				shelfItems: [],
				housePackageTool: null,
			},
		],
		extraCosts: [],
		summary: {
			subTotal: 30,
			grandTotal: 30,
		},
	};
}

describe("new sales form local recovery", () => {
	it("scopes storage keys by type and stable draft identity", () => {
		expect(getRecoveryStorageKey({ type: "order", slug: "ORD-10" })).toBe(
			"new-sales-form:recovery:order:ORD-10",
		);
		expect(getRecoveryStorageKey({ type: "quote", salesId: 12 })).toBe(
			"new-sales-form:recovery:quote:12",
		);
		expect(getRecoveryStorageKey({ type: "order" })).toBe(
			"new-sales-form:recovery:order:draft",
		);
	});

	it("creates and parses versioned recovery snapshots", () => {
		const snapshot = createRecoverySnapshot(
			createPayload(),
			"2026-05-20T10:00:00.000Z",
		);
		const parsed = parseRecoverySnapshot(JSON.stringify(snapshot));

		expect(parsed?.version).toBe(1);
		expect(parsed?.savedAt).toBe("2026-05-20T10:00:00.000Z");
		expect(parsed?.payload.lineItems[0]?.lineTotal).toBe(30);
	});

	it("rejects invalid, stale-version, or incomplete snapshots", () => {
		expect(parseRecoverySnapshot("{bad json")).toBeNull();
		expect(
			parseRecoverySnapshot(
				JSON.stringify({
					version: 0,
					savedAt: "2026-05-20T10:00:00.000Z",
					payload: createPayload(),
				}),
			),
		).toBeNull();
		expect(
			parseRecoverySnapshot(
				JSON.stringify({
					version: 1,
					savedAt: "2026-05-20T10:00:00.000Z",
				}),
			),
		).toBeNull();
	});

	it("fingerprints only recoverable form content", () => {
		const first = createPayload();
		const second = {
			...first,
			salesId: 999,
			slug: "ORD-999",
			version: "v2",
		};
		const changed = {
			...first,
			lineItems: [
				{
					...first.lineItems[0],
					qty: 3,
					lineTotal: 45,
				},
			],
		};

		expect(createPayloadFingerprint(first)).toBe(
			createPayloadFingerprint(second),
		);
		expect(createPayloadFingerprint(first)).not.toBe(
			createPayloadFingerprint(changed),
		);
	});
});
