import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	archiveWorkflowComponentsSchema,
	createWorkflowComponentSchema,
	getStepComponents,
	getStepComponentsSchema,
	saveWorkflowComponentDetailsSchema,
	saveWorkflowComponentPricingSchema,
	saveWorkflowComponentVisibilitySchema,
} from "./sales-form";

const repositoryRoot = existsSync(resolve(process.cwd(), "apps/api/src"))
	? process.cwd()
	: resolve(process.cwd(), "../..");

describe("workflow component mutation contracts", () => {
	test("orders picker components by recent usage without pinning defaults or sort indexes", async () => {
		const component = ({
			id,
			title,
			sortIndex,
			isDefault = false,
			usage,
		}: {
			id: number;
			title: string;
			sortIndex: number;
			isDefault?: boolean;
			usage: {
				housePackageTools: number;
				salesDoors: number;
				stepForms: number;
			};
		}) => ({
			id,
			uid: `component-${id}`,
			name: title,
			img: null,
			meta: {},
			custom: false,
			deletedAt: null,
			sortIndex,
			dykeStepId: 51,
			productCode: null,
			redirectUid: null,
			isDefault,
			door: null,
			product: null,
			step: { id: 51, uid: "material", title: "Material", meta: {} },
			sorts: [],
			_count: usage,
		});
		const result = await getStepComponents(
			{
				db: {
					dykeStepProducts: {
						findMany: async () => [
							component({
								id: 1,
								title: "Popular",
								sortIndex: 99,
								usage: { housePackageTools: 3, salesDoors: 4, stepForms: 3 },
							}),
							component({
								id: 2,
								title: "Beta default",
								sortIndex: 0,
								isDefault: true,
								usage: { housePackageTools: 1, salesDoors: 1, stepForms: 0 },
							}),
							component({
								id: 3,
								title: "Alpha",
								sortIndex: 50,
								usage: { housePackageTools: 0, salesDoors: 1, stepForms: 1 },
							}),
							component({
								id: 4,
								title: "Unused",
								sortIndex: 1,
								usage: { housePackageTools: 0, salesDoors: 0, stepForms: 0 },
							}),
						],
					},
					dykePricingSystem: { findMany: async () => [] },
				},
			} as never,
			{ stepId: 51, fresh: true },
		);

		expect(result.map(({ title }) => title)).toEqual([
			"Popular",
			"Alpha",
			"Beta default",
			"Unused",
		]);
	});

	test("allows the new sales form to bypass stale workflow component cache", () => {
		expect(
			getStepComponentsSchema.parse({ stepId: 51, fresh: true }),
		).toMatchObject({ stepId: 51, fresh: true });
	});

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

	test("accepts a new component bound to the active workflow step", () => {
		expect(
			createWorkflowComponentSchema.parse({
				stepId: 12,
				title: "New component",
				productCode: null,
				img: null,
			}),
		).toMatchObject({ stepId: 12, title: "New component" });
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
		const accessSource = readFileSync(
			resolve(
				repositoryRoot,
				"apps/api/src/utils/workflow-component-access.ts",
			),
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
			"createWorkflowComponent",
			"saveWorkflowComponentDetails",
			"saveWorkflowComponentVisibility",
			"saveWorkflowComponentSectionOverride",
			"saveWorkflowComponentRedirect",
			"saveWorkflowComponentPricing",
			"archiveWorkflowComponents",
		]) {
			expect(routerSource).toContain(`${mutation}: protectedProcedure`);
		}
		expect(accessSource).toContain('"editSalesComponent"');
		expect(routerSource).toContain("requireWorkflowComponentEditor(ctx)");
		expect(routerSource).toContain("requireSuperAdmin(ctx)");
		expect(querySource).toContain("invalidateSalesWorkflowForStepComponent");
		expect(querySource).toContain("queueDykeStepToInventorySync");
		expect(inventorySource).toContain("productCode,");
	});
});
