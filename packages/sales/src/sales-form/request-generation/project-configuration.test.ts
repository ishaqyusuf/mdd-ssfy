import { describe, expect, it } from "bun:test";
import type {
	RequestConfigurationComponent,
	RequestConfigurationRepository,
	RequestConfigurationRootComponent,
	RequestConfigurationStep,
} from "./load-configuration";
import {
	type ProjectRequestConfigurationInput,
	projectRequestConfiguration,
} from "./project-configuration";

const steps: RequestConfigurationStep[] = [
	{ id: 10, uid: "step-a", title: "Material" },
	{ id: 20, uid: "step-b", title: "Style" },
];

type ComponentFixture = RequestConfigurationComponent & {
	custom?: boolean | null;
	deletedAt?: Date | string | null;
};

const rootComponent = (
	uid: string,
	id: number,
): RequestConfigurationRootComponent => ({
	id,
	uid,
	name: uid,
	meta: {},
	redirectUid: null,
	dykeStepId: 1,
	step: { id: 1, uid: "root-step", title: "Item Type" },
});

const familyComponent = (
	input: Pick<
		RequestConfigurationComponent,
		"id" | "uid" | "dykeStepId" | "meta"
	> &
		Partial<Pick<ComponentFixture, "custom" | "deletedAt">>,
): ComponentFixture => ({
	...input,
	name: input.uid,
	redirectUid: null,
});

function repository(
	meta: unknown,
	components: RequestConfigurationComponent[],
	configuredSteps: readonly RequestConfigurationStep[] = steps,
): RequestConfigurationRepository {
	return {
		getSetting: async (id) => ({ id, meta }),
		getStepsByUids: async () => configuredSteps,
		getRootComponentsByUids: async (uids) =>
			uids.map((uid, index) => rootComponent(uid, index + 1)),
		getComponentsByStepIds: async (stepIds) =>
			components.filter((component) => stepIds.includes(component.dykeStepId)),
	};
}

function baseInput(
	meta: unknown,
	components: RequestConfigurationComponent[],
	defaults?: ProjectRequestConfigurationInput["defaults"],
	configuredSteps: readonly RequestConfigurationStep[] = steps,
): ProjectRequestConfigurationInput {
	return {
		settingId: 7,
		repository: repository(meta, components, configuredSteps),
		defaults,
	};
}

describe("projectRequestConfiguration", () => {
	it("builds a price-free model configuration", async () => {
		const result = await projectRequestConfiguration(
			baseInput(
				{
					route: {
						"root-a": { routeSequence: [{ uid: "step-a" }, { uid: "step-b" }] },
						"root-b": { routeSequence: [{ uid: "step-a" }] },
					},
				},
				components,
				{
					"root-a": {
						"step-a": "a-choice",
					},
				},
			),
		);

		const serialized = JSON.parse(result.configurationJson);
		expect(serialized.steps.map((step: { id: number }) => step.id)).toEqual([
			1, 10, 20,
		]);
		expect(result.configuration.steps).toEqual([
			{
				id: 1,
				uid: "root-step",
				title: "Item Type",
				selectionMode: "single",
				components: [
					{ uid: "root-a", title: "root-a" },
					{ uid: "root-b", title: "root-b" },
				],
			},
			{
				id: 10,
				uid: "step-a",
				title: "Material",
				selectionMode: "single",
				components: [
					{
						uid: "a-choice",
						title: "a-choice",
					},
				],
			},
			{
				id: 20,
				uid: "step-b",
				title: "Style",
				selectionMode: "single",
				components: [{ uid: "b-choice", title: "b-choice" }],
			},
		]);
		expect(serialized.routes).toEqual([
			{
				itemTypeUid: "root-a",
				rootStepId: 1,
				stepUids: ["step-a", "step-b"],
				defaults: { "step-a": "a-choice" },
			},
			{
				itemTypeUid: "root-b",
				rootStepId: 1,
				stepUids: ["step-a"],
			},
		]);
		expect(serialized.visibilityByComponentUid["a-choice"]).toEqual({
			variations: [
				{
					rules: [
						{
							stepUid: "root-step",
							operator: "is",
							componentsUid: ["root-a"],
						},
					],
				},
			],
			redirectUid: "step-b",
			sectionOverride: { noHandle: true },
		});
		expect(
			result.configuration.steps.flatMap((step) => step.components),
		).not.toContainEqual(expect.objectContaining({ uid: "deleted" }));
		const sharedStepIds = new Set(
			result.configuration.steps.map((step) => step.id),
		);
		for (const route of result.configuration.routes as Array<{
			rootStepId: number;
		}>) {
			expect(sharedStepIds.has(route.rootStepId)).toBe(true);
		}
	});

	it("projects only the authoritative step-level custom capability", async () => {
		const result = await projectRequestConfiguration(
			baseInput(
				{
					route: {
						"root-a": {
							routeSequence: [{ uid: "step-a" }, { uid: "step-b" }],
						},
					},
				},
				components,
				undefined,
				[
					{ id: 10, uid: "step-a", title: "Material", meta: { custom: true } },
					{
						id: 20,
						uid: "step-b",
						title: "Style",
						meta: { custom: false },
					},
				],
			),
		);

		expect(result.configuration.steps).toContainEqual(
			expect.objectContaining({ uid: "step-a", custom: true }),
		);
		expect(
			result.configuration.steps.find((step) => step.uid === "step-b"),
		).not.toHaveProperty("custom");
		expect(JSON.parse(result.configurationJson).steps).toContainEqual(
			expect.objectContaining({ uid: "step-a", custom: true }),
		);
	});

	it("uses stored route defaults when no runtime override is supplied", async () => {
		const result = await projectRequestConfiguration(
			baseInput(
				{
					route: {
						"root-a": {
							routeSequence: [{ uid: "step-a" }, { uid: "step-b" }],
							requestGeneration: {
								defaults: { "step-a": "a-choice" },
							},
						},
						"root-b": {
							routeSequence: [{ uid: "step-a" }],
							requestGeneration: {
								defaults: { "step-a": null },
							},
						},
					},
				},
				components,
			),
		);

		const expectedRoutes = [
			{
				itemTypeUid: "root-a",
				rootStepId: 1,
				stepUids: ["step-a", "step-b"],
				defaults: { "step-a": "a-choice" },
			},
			{
				itemTypeUid: "root-b",
				rootStepId: 1,
				stepUids: ["step-a"],
			},
		];
		expect(result.configuration.routes).toEqual(expectedRoutes);
		expect(JSON.parse(result.configurationJson).routes).toEqual(expectedRoutes);
	});

	it("rejects dangling visibility dependencies and defaults", async () => {
		await expect(
			projectRequestConfiguration(
				baseInput(
					{
						route: { "root-a": { routeSequence: [{ uid: "step-a" }] } },
					},
					[
						familyComponent({
							id: 101,
							uid: "a-choice",
							dykeStepId: 10,
							meta: {
								variations: [
									{
										rules: [
											{
												stepUid: "missing-step",
												operator: "is",
												componentsUid: ["missing-component"],
											},
										],
									},
								],
							},
						}),
					],
				),
			),
		).rejects.toThrow("Dangling visibility step UID missing-step");

		await expect(
			projectRequestConfiguration(
				baseInput(
					{ route: { "root-a": { routeSequence: [{ uid: "step-a" }] } } },
					[
						familyComponent({
							id: 104,
							uid: "a-choice",
							dykeStepId: 10,
							meta: {},
						}),
					],
					{ "root-a": { "step-a": "not-a-choice" } },
				),
			),
		).rejects.toThrow("Default component not-a-choice is not in step step-a");
	});

	it("omits candidates whose visibility requires only deleted components", async () => {
		const result = await projectRequestConfiguration(
			baseInput(
				{
					route: {
						"root-a": {
							routeSequence: [{ uid: "step-a" }, { uid: "step-b" }],
						},
					},
				},
				[
					familyComponent({
						id: 101,
						uid: "active-a",
						dykeStepId: 10,
						meta: {},
					}),
					familyComponent({
						id: 102,
						uid: "unreachable-b",
						dykeStepId: 20,
						meta: {
							variations: [
								{
									rules: [
										{
											stepUid: "step-a",
											operator: "is",
											componentsUid: ["deleted-a"],
										},
									],
								},
							],
						},
					}),
				],
			),
		);

		expect(result.configuration.steps[2]?.components).toEqual([]);
		expect(
			result.configuration.visibilityByComponentUid["unreachable-b"],
		).toBeUndefined();
	});

	it("makes a deleted-only isNot dependency unrestricted", async () => {
		const result = await projectRequestConfiguration(
			baseInput(
				{
					route: {
						"root-a": {
							routeSequence: [{ uid: "step-a" }, { uid: "step-b" }],
						},
					},
				},
				[
					familyComponent({
						id: 101,
						uid: "active-a",
						dykeStepId: 10,
						meta: {},
					}),
					familyComponent({
						id: 102,
						uid: "visible-b",
						dykeStepId: 20,
						meta: {
							variations: [
								{
									rules: [
										{
											stepUid: "step-a",
											operator: "isNot",
											componentsUid: ["deleted-a"],
										},
									],
								},
							],
						},
					}),
				],
			),
		);

		expect(result.configuration.steps[2]?.components).toEqual([
			{ uid: "visible-b", title: "visible-b" },
		]);
		expect(
			result.configuration.visibilityByComponentUid["visible-b"],
		).toBeUndefined();
	});

	it("emits sparse visibility metadata for active components", async () => {
		const meaningfulVariations = [
			{
				rules: [
					{
						stepUid: "step-a",
						operator: "is" as const,
						componentsUid: ["plain"],
					},
				],
			},
		];
		const result = await projectRequestConfiguration(
			baseInput(
				{
					route: {
						"root-a": {
							routeSequence: [{ uid: "step-a" }, { uid: "step-b" }],
						},
					},
				},
				[
					familyComponent({
						id: 101,
						uid: "plain",
						dykeStepId: 10,
						meta: {},
					}),
					{
						...familyComponent({
							id: 102,
							uid: "redirected",
							dykeStepId: 20,
							meta: {},
						}),
						redirectUid: "step-b",
					},
					familyComponent({
						id: 103,
						uid: "custom-true",
						dykeStepId: 20,
						meta: {},
						custom: true,
					}),
					familyComponent({
						id: 104,
						uid: "conditional",
						dykeStepId: 20,
						meta: { variations: meaningfulVariations },
						custom: false,
					}),
					familyComponent({
						id: 105,
						uid: "section-only",
						dykeStepId: 20,
						meta: { sectionOverride: { noHandle: true } },
					}),
					familyComponent({
						id: 106,
						uid: "deleted",
						dykeStepId: 20,
						meta: {},
						deletedAt: "2026-01-01",
					}),
				],
			),
		);

		const serialized = JSON.parse(result.configurationJson) as {
			steps: Array<{
				uid: string;
				components: Array<[string, string]>;
			}>;
			visibilityByComponentUid: Record<string, unknown>;
		};
		const visibility = serialized.visibilityByComponentUid;
		const styleStep = serialized.steps.find((step) => step.uid === "step-b");

		expect(styleStep?.components).toEqual([
			["conditional", "conditional"],
			["redirected", "redirected"],
			["section-only", "section-only"],
		]);
		expect(visibility).toEqual({
			redirected: { redirectUid: "step-b" },
			conditional: { variations: meaningfulVariations },
			"section-only": { sectionOverride: { noHandle: true } },
		});
		expect(visibility).not.toHaveProperty("plain");
		expect(visibility).not.toHaveProperty("deleted");
		expect(visibility.conditional).not.toHaveProperty("redirectUid");
	});
});

const components: RequestConfigurationComponent[] = [
	familyComponent({
		id: 101,
		uid: "a-choice",
		dykeStepId: 10,
		meta: {
			variations: [
				{
					rules: [
						{
							stepUid: "root-step",
							operator: "is",
							componentsUid: ["root-a"],
						},
					],
				},
			],
			sectionOverride: { noHandle: true },
		},
	}),
	familyComponent({
		id: 102,
		uid: "b-choice",
		dykeStepId: 20,
		meta: {},
	}),
	familyComponent({
		id: 103,
		uid: "deleted",
		dykeStepId: 10,
		meta: { deletedAt: "2026-01-01" },
	}),
];

// Keep the fixture's redirect separate from the declarations above so the
// successful path also exercises redirect metadata in the serialized payload.
const firstComponent = components[0];
if (!firstComponent) throw new Error("Missing component fixture");
components[0] = {
	...firstComponent,
	redirectUid: "step-b",
};
