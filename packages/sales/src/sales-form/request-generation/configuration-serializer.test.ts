import { expect, test } from "bun:test";
import {
	getSalesRequestConfigurationDefaults,
	serializeSalesRequestConfiguration,
} from "./configuration-serializer";

test("extracts only normalized string defaults from projected routes", () => {
	expect(
		getSalesRequestConfigurationDefaults({
			schemaVersion: 1,
			routes: [
				{
					itemTypeUid: " exterior ",
					defaults: {
						" finish ": " white ",
						empty: " ",
						invalid: 9,
					},
				},
				{ itemTypeUid: "interior" },
			],
			steps: [],
			visibilityByComponentUid: {},
		}),
	).toEqual({ exterior: { finish: "white" } });
});

test("round-trips punctuation and Unicode while projecting components to tuples", () => {
	const configuration = {
		schemaVersion: 1 as const,
		routes: [
			{
				itemTypeUid: "exterior",
				routeSequence: [
					{ uid: "step-z", title: 'First: "wide" / 東京' },
					{ uid: "step-a", title: "Second — München" },
				],
				rules: {
					OR: [{ componentUid: "door-a" }, { componentUid: "door-b" }],
					AND: [{ stepUid: "step-z", operator: "isNot" }],
				},
			},
		],
		steps: [
			{
				id: 20,
				uid: "step-z",
				title: 'Finish / "Trim" — 门',
				components: [
					{ uid: "component-z", title: 'Café, "dark" & oak' },
					{ uid: "component-a", title: "München / 東京" },
				],
			},
			{
				id: 10,
				uid: "step-a",
				title: "Material",
				components: [{ uid: "component-b", title: "Fiberglass" }],
			},
		],
		visibilityByComponentUid: {
			"component-z": {
				variations: [
					{
						rules: [
							{
								stepUid: "step-a",
								operator: "is",
								componentsUid: ["component-b"],
							},
							{
								stepUid: "step-z",
								operator: "isNot",
								componentsUid: ["component-a"],
							},
						],
					},
				],
			},
		},
	};

	const parsed = JSON.parse(serializeSalesRequestConfiguration(configuration));
	expect(parsed).toEqual({
		componentColumns: ["uid", "title"],
		routes: configuration.routes,
		schemaVersion: 1,
		steps: [
			{
				id: 10,
				uid: "step-a",
				title: "Material",
				components: [["component-b", "Fiberglass"]],
			},
			{
				id: 20,
				uid: "step-z",
				title: 'Finish / "Trim" — 门',
				components: [
					["component-z", 'Café, "dark" & oak'],
					["component-a", "München / 東京"],
				],
			},
		],
		visibilityByComponentUid: configuration.visibilityByComponentUid,
	});
});

test("is deterministic across input object and candidate ordering", () => {
	const first = {
		schemaVersion: 1 as const,
		routes: [
			{
				routeSequence: [{ uid: "first" }, { uid: "second" }],
				rules: { OR: ["a", "b"], AND: ["c"] },
			},
		],
		steps: [
			{
				id: 20,
				uid: "z",
				title: "Z",
				components: [
					{ uid: "z-2", title: "Two" },
					{ uid: "z-1", title: "One" },
				],
			},
			{
				id: 10,
				uid: "a",
				title: "A",
				components: [{ uid: "a-1", title: "One" }],
			},
		],
		visibilityByComponentUid: {
			"z-2": { b: 2, a: 1 },
			"a-1": { enabled: true },
		},
	};
	const second = {
		visibilityByComponentUid: {
			"a-1": { enabled: true },
			"z-2": { a: 1, b: 2 },
		},
		steps: [
			{
				id: 10,
				uid: "a",
				title: "A",
				components: [{ uid: "a-1", title: "One" }],
			},
			{
				id: 20,
				uid: "z",
				title: "Z",
				components: [
					{ uid: "z-1", title: "One" },
					{ uid: "z-2", title: "Two" },
				],
			},
		],
		routes: [
			{
				rules: { AND: ["c"], OR: ["a", "b"] },
				routeSequence: [{ uid: "first" }, { uid: "second" }],
			},
		],
		schemaVersion: 1 as const,
	};

	const serialized = serializeSalesRequestConfiguration(first);
	expect(serialized).toBe(serializeSalesRequestConfiguration(second));
	expect(serialized).toStartWith('{"componentColumns":["uid","title"]');
});

test("projects custom capability sparsely onto steps", () => {
	const serialized = serializeSalesRequestConfiguration({
		schemaVersion: 1,
		routes: [],
		steps: [
			{
				id: 1,
				uid: "custom-step",
				title: "Custom-capable",
				custom: true,
				components: [{ uid: "standard", title: "Standard" }],
			},
			{
				id: 2,
				uid: "ordinary-step",
				title: "Ordinary",
				components: [{ uid: "ordinary", title: "Ordinary" }],
			},
		],
		visibilityByComponentUid: {},
	});

	const steps = JSON.parse(serialized).steps as Array<{
		uid: string;
		custom?: boolean;
		components: Array<[string, string]>;
	}>;
	expect(steps.find((step) => step.uid === "custom-step")).toEqual({
		id: 1,
		uid: "custom-step",
		title: "Custom-capable",
		custom: true,
		components: [["standard", "Standard"]],
	});
	expect(steps.find((step) => step.uid === "ordinary-step")).not.toHaveProperty(
		"custom",
	);
});

test("preserves bounded door-size variations", () => {
	const serialized = serializeSalesRequestConfiguration({
		schemaVersion: 1,
		routes: [],
		steps: [
			{
				id: 1,
				uid: "height",
				title: "Height",
				doorSizeVariation: [
					{
						rules: [
							{
								stepUid: "height",
								operator: "is",
								componentsUid: ["height-68"],
							},
						],
						widthList: ["2-4", "2-10", "3-0"],
					},
				],
				components: [{ uid: "height-68", title: "6-8" }],
			},
		],
		visibilityByComponentUid: {},
	});
	const height = JSON.parse(serialized).steps[0];
	expect(height.doorSizeVariation[0].widthList).toEqual(["2-4", "2-10", "3-0"]);
});

test("includes only the bounded name-only service vocabulary", () => {
	const serialized = serializeSalesRequestConfiguration({
		schemaVersion: 1,
		routes: [],
		steps: [],
		visibilityByComponentUid: {},
		serviceNames: ["INSTALLATION", "DOOR COPY FEE"],
	});
	expect(JSON.parse(serialized).serviceNames).toEqual([
		"INSTALLATION",
		"DOOR COPY FEE",
	]);
	expect(() =>
		serializeSalesRequestConfiguration({
			schemaVersion: 1,
			routes: [],
			steps: [],
			visibilityByComponentUid: {},
			serviceNames: Array.from(
				{ length: 21 },
				(_, index) => `SERVICE ${index}`,
			),
		}),
	).toThrow("bounded array");
});

test("orders candidates by persisted index without serializing the index", () => {
	const serialized = serializeSalesRequestConfiguration({
		schemaVersion: 1,
		routes: [],
		steps: [
			{
				id: 1,
				uid: "style",
				title: "Style",
				components: [
					{ uid: "unranked", title: "A unranked" },
					{ uid: "second", title: "Z second", sortIndex: 20 },
					{ uid: "first", title: "Z first", sortIndex: 10 },
				],
			},
		],
		visibilityByComponentUid: {},
	});

	expect(JSON.parse(serialized).steps[0].components).toEqual([
		["first", "Z first"],
		["second", "Z second"],
		["unranked", "A unranked"],
	]);
	expect(serialized).not.toContain("sortIndex");
});

test("preserves route sequence and nested AND/OR visibility rule semantics", () => {
	const configuration = {
		schemaVersion: 1 as const,
		routes: [
			{
				routeSequence: [{ uid: "step-second" }, { uid: "step-first" }],
				rules: {
					AND: [{ field: "x" }, { field: "y" }],
					OR: [{ field: "a" }, { field: "b" }],
				},
			},
		],
		steps: [
			{
				id: 10,
				uid: "step-first",
				title: "First",
				components: [{ uid: "component-first", title: "First" }],
			},
			{
				id: 20,
				uid: "step-second",
				title: "Second",
				components: [{ uid: "component-second", title: "Second" }],
			},
		],
		visibilityByComponentUid: {
			"component-second": {
				variations: [
					{
						rules: [
							{
								stepUid: "step-first",
								operator: "is",
								componentsUid: ["component-first"],
							},
							{
								stepUid: "step-first",
								operator: "isNot",
								componentsUid: ["component-second"],
							},
						],
					},
					{
						rules: [
							{
								stepUid: "step-second",
								operator: "is",
								componentsUid: ["component-second"],
							},
						],
					},
				],
			},
		},
	};

	const parsed = JSON.parse(serializeSalesRequestConfiguration(configuration));
	expect(parsed.routes[0].routeSequence).toEqual(
		configuration.routes[0].routeSequence,
	);
	expect(parsed.routes[0].rules).toEqual(configuration.routes[0].rules);
	expect(parsed.visibilityByComponentUid).toEqual(
		configuration.visibilityByComponentUid,
	);
});

test("rejects duplicate step and component identities", () => {
	const base = {
		schemaVersion: 1 as const,
		routes: [],
		visibilityByComponentUid: {},
	};

	expect(() =>
		serializeSalesRequestConfiguration({
			...base,
			steps: [
				{ id: 1, uid: "duplicate", title: "One", components: [] },
				{ id: 2, uid: "duplicate", title: "Two", components: [] },
			],
		}),
	).toThrow("Duplicate step UID: duplicate");

	expect(() =>
		serializeSalesRequestConfiguration({
			...base,
			steps: [
				{
					id: 1,
					uid: "step",
					title: "Step",
					components: [
						{ uid: "duplicate", title: "One" },
						{ uid: "duplicate", title: "Two" },
					],
				},
			],
		}),
	).toThrow("Duplicate component UID: duplicate");
});

test("rejects a component UID reused by another step", () => {
	expect(() =>
		serializeSalesRequestConfiguration({
			schemaVersion: 1,
			routes: [],
			steps: [
				{
					id: 1,
					uid: "step-a",
					title: "A",
					components: [{ uid: "component", title: "A" }],
				},
				{
					id: 2,
					uid: "step-b",
					title: "B",
					components: [{ uid: "component", title: "B" }],
				},
			],
			visibilityByComponentUid: {},
		}),
	).toThrow("Duplicate component UID: component");
});
