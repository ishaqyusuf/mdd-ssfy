import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	archiveWorkflowComponentsSchema,
	saveWorkflowComponentDetailsSchema,
	saveWorkflowComponentPricingSchema,
	saveWorkflowComponentVisibilitySchema,
} from "./sales-form";

const repositoryRoot = existsSync(resolve(process.cwd(), "apps/api/src"))
	? process.cwd()
	: resolve(process.cwd(), "../..");

describe("workflow component mutation contracts", () => {
	test("accepts the catalog details and OR/AND visibility contracts", () => {
		expect(
			saveWorkflowComponentDetailsSchema.parse({
				componentId: 10,
				title: "Sill",
				productCode: "SL-10",
				img: "asset-id",
			}),
		).toMatchObject({ productCode: "SL-10" });
		expect(
			saveWorkflowComponentVisibilitySchema.parse({
				componentIds: [10, 11],
				variations: [
					{
						rules: [
							{
								stepUid: "door-type",
								operator: "isNot",
								componentsUid: ["double-door"],
							},
						],
					},
				],
			}),
		).toMatchObject({ componentIds: [10, 11] });
	});

	test("requires canonical component ids and owned pricing-row identities", () => {
		expect(() =>
			archiveWorkflowComponentsSchema.parse({ componentIds: [] }),
		).toThrow();
		expect(
			saveWorkflowComponentPricingSchema.parse({
				componentId: 10,
				pricings: [{ id: 99, dependenciesUid: "a-b", price: 42.5 }],
			}),
		).toMatchObject({ componentId: 10 });
	});

	test("wires protected role checks, cache invalidation, sync, and product-code persistence", () => {
		const querySource = readFileSync(
			resolve(repositoryRoot, "apps/api/src/db/queries/sales-form.ts"),
			"utf8",
		);
		const routerSource = readFileSync(
			resolve(repositoryRoot, "apps/api/src/trpc/routers/sales.route.ts"),
			"utf8",
		);
		const inventorySource = readFileSync(
			resolve(
				repositoryRoot,
				"packages/inventory/src/application/definitions/dyke-step-components.ts",
			),
			"utf8",
		);
		for (const mutation of [
			"saveWorkflowComponentDetails",
			"saveWorkflowComponentVisibility",
			"saveWorkflowComponentSectionOverride",
			"saveWorkflowComponentRedirect",
			"saveWorkflowComponentPricing",
			"archiveWorkflowComponents",
		]) {
			expect(routerSource).toContain(`${mutation}: protectedProcedure`);
		}
		expect(routerSource).toContain("requireWorkflowComponentAdmin");
		expect(routerSource).toContain("requireSuperAdmin(ctx)");
		expect(querySource).toContain("invalidateSalesWorkflowForStepComponent");
		expect(querySource).toContain("queueDykeStepToInventorySync");
		expect(inventorySource).toContain("productCode,");
	});
});
