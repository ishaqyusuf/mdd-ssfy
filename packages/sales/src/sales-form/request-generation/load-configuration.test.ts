import { describe, expect, it } from "bun:test";
import {
	type RequestConfigurationRepository,
	loadRequestConfigurationSource,
} from "./load-configuration";

const component = (input: {
	id: number;
	uid: string;
	stepId: number;
	name?: string;
}) => ({
	id: input.id,
	uid: input.uid,
	name: input.name ?? input.uid,
	meta: {},
	redirectUid: null,
	dykeStepId: input.stepId,
});

const root = (uid: string, id: number) => ({
	...component({ id, uid, stepId: 1, name: uid }),
	step: { id: 1, uid: "root-step", title: "Item Type" },
});

function repository(
	setting: Parameters<RequestConfigurationRepository["getSetting"]>[0],
	meta: unknown,
	steps: Awaited<ReturnType<RequestConfigurationRepository["getStepsByUids"]>>,
	roots: Awaited<
		ReturnType<RequestConfigurationRepository["getRootComponentsByUids"]>
	>,
	components: Awaited<
		ReturnType<RequestConfigurationRepository["getComponentsByStepIds"]>
	>,
	calls: string[],
): RequestConfigurationRepository {
	return {
		getSetting: async (id) => {
			calls.push(`setting:${id}`);
			return setting ? { id: setting, meta } : null;
		},
		getStepsByUids: async (uids) => {
			calls.push(`steps:${uids.join(",")}`);
			return steps;
		},
		getRootComponentsByUids: async (uids) => {
			calls.push(`roots:${uids.join(",")}`);
			return roots;
		},
		getComponentsByStepIds: async (ids) => {
			calls.push(`components:${ids.join(",")}`);
			return components;
		},
	};
}

describe("loadRequestConfigurationSource", () => {
	it("requires the explicitly requested settings row", async () => {
		const calls: string[] = [];
		await expect(
			loadRequestConfigurationSource(
				{ settingId: 7 },
				repository(0, {}, [], [], [], calls),
			),
		).rejects.toThrow("Sales settings not found: 7");
		expect(calls).toEqual(["setting:7"]);
	});

	it("resolves duplicate steps using the New Sales Form's highest-ID authority", async () => {
		const calls: string[] = [];
		const steps = [
			{ id: 21, uid: "height", title: "Height" },
			{ id: 41, uid: "height", title: "Door Type" },
		];
		const source = await loadRequestConfigurationSource(
			{ settingId: 7 },
			repository(
				7,
				{ route: { root: { routeSequence: [{ uid: "height" }] } } },
				steps,
				[root("root", 100)],
				[component({ id: 200, uid: "door-type", stepId: 41 })],
				calls,
			),
		);
		expect(source.steps).toEqual([
			expect.objectContaining({ id: 41, uid: "height", title: "Door Type" }),
		]);
		expect(calls).toEqual([
			"setting:7",
			"steps:height",
			"roots:root",
			"components:41",
		]);
	});

	it("retains authoritative step metadata and excludes persisted custom rows", async () => {
		const calls: string[] = [];
		const source = await loadRequestConfigurationSource(
			{ settingId: 7 },
			repository(
				7,
				{ route: { root: { routeSequence: [{ uid: "step" }] } } },
				[{ id: 1, uid: "step", title: "Step", meta: { custom: true } }],
				[root("root", 2)],
				[
					component({ id: 200, uid: "standard", stepId: 1 }),
					{
						...component({ id: 201, uid: "persisted-custom", stepId: 1 }),
						custom: true,
					},
				],
				calls,
			),
		);

		expect(source.steps[0]?.meta).toEqual({ custom: true });
		expect(source.components.map((item) => item.uid)).toEqual(["standard"]);
	});

	it("rejects malformed route sequences instead of publishing an empty route", async () => {
		const calls: string[] = [];
		await expect(
			loadRequestConfigurationSource(
				{ settingId: 7 },
				repository(
					7,
					{ route: { root: { routeSequence: [{ uid: "step" }, null] } } },
					[],
					[],
					[],
					calls,
				),
			),
		).rejects.toThrow("Invalid routeSequence entry root[1]");
		expect(calls).toEqual(["setting:7"]);
	});

	it("rejects a route containing only its empty terminator", async () => {
		const calls: string[] = [];
		await expect(
			loadRequestConfigurationSource(
				{ settingId: 7 },
				repository(
					7,
					{ route: { root: { routeSequence: [{ uid: "" }] } } },
					[],
					[],
					[],
					calls,
				),
			),
		).rejects.toThrow("no configured steps");
		expect(calls).toEqual(["setting:7"]);
	});

	it("accepts the existing final empty route terminator", async () => {
		const calls: string[] = [];
		const result = await loadRequestConfigurationSource(
			{ settingId: 7 },
			repository(
				7,
				{ route: { root: { routeSequence: [{ uid: "step" }, { uid: "" }] } } },
				[{ id: 1, uid: "step", title: "Step" }],
				[root("root", 2)],
				[],
				calls,
			),
		);
		expect(result.routes).toEqual([
			{ itemTypeUid: "root", stepUids: ["step"] },
		]);
		expect(calls).toEqual([
			"setting:7",
			"steps:step",
			"roots:root",
			"components:1",
		]);
	});

	it("reads stored defaults from the selected route metadata", async () => {
		const calls: string[] = [];
		const result = await loadRequestConfigurationSource(
			{ settingId: 7 },
			repository(
				7,
				{
					route: {
						root: {
							routeSequence: [{ uid: "step" }],
							requestGeneration: {
								defaults: { step: "direct-choice", cleared: null },
							},
						},
					},
					data: {
						route: {
							root: {
								routeSequence: [{ uid: "step" }],
								requestGeneration: { defaults: { step: "nested-choice" } },
							},
						},
					},
				},
				[{ id: 1, uid: "step", title: "Step" }],
				[root("root", 2)],
				[],
				calls,
			),
		);

		expect(result.defaults).toEqual({ root: { step: "direct-choice" } });
	});

	it("scopes routes, roots, and component families to the configured data", async () => {
		const calls: string[] = [];
		const steps = [
			{ id: 20, uid: "step-b", title: "B" },
			{ id: 10, uid: "step-a", title: "A" },
			{ id: 99, uid: "obsolete", title: "Obsolete" },
		];
		const roots = [
			root("root-b", 2),
			root("root-a", 1),
			root("obsolete-root", 3),
		];
		const components = [
			component({ id: 201, uid: "b-choice", stepId: 20 }),
			component({ id: 101, uid: "a-choice", stepId: 10 }),
			component({ id: 999, uid: "obsolete-choice", stepId: 99 }),
		];

		const result = await loadRequestConfigurationSource(
			{ settingId: 7 },
			repository(
				7,
				{
					route: {
						"root-b": {
							routeSequence: [{ uid: "step-b" }, { uid: "step-a" }],
							route: { "step-a": "obsolete" },
						},
						"root-a": { routeSequence: [{ uid: "step-a" }] },
					},
				},
				steps,
				roots,
				components,
				calls,
			),
		);

		expect(calls).toEqual([
			"setting:7",
			"steps:step-a,step-b",
			"roots:root-a,root-b",
			"components:10,20",
		]);
		expect(result.routes).toEqual([
			{ itemTypeUid: "root-a", stepUids: ["step-a"] },
			{ itemTypeUid: "root-b", stepUids: ["step-b", "step-a"] },
		]);
		expect(result.steps.map((step) => step.uid)).toEqual(["step-a", "step-b"]);
		expect(result.rootComponents.map((item) => item.uid)).toEqual([
			"root-a",
			"root-b",
		]);
		expect(result.components.map((item) => item.uid)).toEqual([
			"b-choice",
			"a-choice",
		]);
		expect(result.steps.some((step) => step.uid === "obsolete")).toBe(false);
		expect(
			result.components.some((item) => item.uid === "obsolete-choice"),
		).toBe(false);
	});
});
