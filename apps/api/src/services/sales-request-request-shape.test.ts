import { describe, expect, test } from "bun:test";
import type { NewSalesFormSeed } from "@gnd/sales/sales-form-core";
import {
	SALES_REQUEST_COMPLEXITY_VERSION,
	deriveSalesRequestComplexity,
} from "./sales-request-request-shape";

function scalarLine(
	uid = "private-line",
	stepId = 987,
): NewSalesFormSeed["lineItems"][number] {
	return {
		uid,
		qty: 999,
		formSteps: [
			{ stepId, prodUid: "private-root" },
			{ stepId: stepId + 1, prodUid: "private-style" },
		],
	};
}

describe("Sales Request privacy-safe request shape", () => {
	test("classifies one scalar line as simple", () => {
		expect(
			deriveSalesRequestComplexity({
				schemaVersion: 2,
				lineItems: [scalarLine()],
				unresolved: [],
			}),
		).toEqual({ version: SALES_REQUEST_COMPLEXITY_VERSION, stratum: "simple" });
	});

	test("uses only structural counts and ignores identifiers and quantities", () => {
		const first = {
			schemaVersion: 2 as const,
			lineItems: [scalarLine("customer-shaped-secret", 100)],
			unresolved: [],
		};
		const second = {
			...first,
			lineItems: [
				{
					...scalarLine("different-private-value", 900),
					qty: 1,
					formSteps: [
						{ stepId: 900, prodUid: "different-root" },
						{ stepId: 901, prodUid: "different-style" },
					],
				},
			],
		};
		expect(deriveSalesRequestComplexity(first)).toEqual(
			deriveSalesRequestComplexity(second),
		);
		expect(JSON.stringify(deriveSalesRequestComplexity(first))).not.toMatch(
			/customer-shaped-secret|private-root|987|999/,
		);
	});

	test("promotes bounded structural work to standard and complex", () => {
		const standard: NewSalesFormSeed = {
			schemaVersion: 2,
			lineItems: [
				{
					...scalarLine(),
					formSteps: [
						...scalarLine().formSteps,
						{
							stepId: 999,
							meta: { selectedProdUids: ["a", "b"] },
						},
					],
				},
			],
			unresolved: [],
		};
		const complex: NewSalesFormSeed = {
			...standard,
			lineItems: [scalarLine("one"), scalarLine("two"), scalarLine("three")],
		};
		expect(deriveSalesRequestComplexity(standard)?.stratum).toBe("standard");
		expect(deriveSalesRequestComplexity(complex)?.stratum).toBe("complex");
	});

	test("accounts for structured rows and delivery without retaining their facts", () => {
		const seed: NewSalesFormSeed = {
			schemaVersion: 2,
			lineItems: [
				{
					uid: "line",
					qty: 4,
					formSteps: [{ stepId: 1, prodUid: "root" }],
					housePackageTool: {
						doors: [
							{ dimension: "secret-size-a", totalQty: 1 },
							{ dimension: "secret-size-b", totalQty: 1 },
							{ dimension: "secret-size-c", totalQty: 1 },
							{ dimension: "secret-size-d", totalQty: 1 },
						],
					},
				},
			],
			form: { deliveryOption: "delivery" },
			unresolved: [],
		};
		const result = deriveSalesRequestComplexity(seed);
		expect(result).toEqual({
			version: SALES_REQUEST_COMPLEXITY_VERSION,
			stratum: "complex",
		});
		expect(JSON.stringify(result)).not.toContain("secret-size");
	});

	test("fails closed for unresolved, custom, and malformed seeds", () => {
		const unresolved: NewSalesFormSeed = {
			schemaVersion: 2,
			lineItems: [scalarLine()],
			unresolved: [
				{
					lineUid: null,
					stepId: null,
					field: "unknown",
					status: "ambiguous",
					reason: "private reason",
				},
			],
		};
		const custom: NewSalesFormSeed = {
			schemaVersion: 2,
			lineItems: [
				{
					uid: "line",
					qty: 1,
					formSteps: [{ stepId: 1, value: "private custom value" }],
				},
			],
			unresolved: [],
		};
		expect(deriveSalesRequestComplexity(unresolved)).toBeNull();
		expect(deriveSalesRequestComplexity(custom)).toBeNull();
		expect(
			deriveSalesRequestComplexity({
				schemaVersion: 2,
				lineItems: [],
				unresolved: [],
			} as NewSalesFormSeed),
		).toBeNull();
	});
});
