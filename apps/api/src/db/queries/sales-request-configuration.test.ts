import { expect, mock, test } from "bun:test";
import type { SalesRequestConfigurationCache } from "@gnd/cache/sales-request-configuration-cache";
import type { PrismaClient } from "@prisma/client";
import {
	getSalesRequestConfigurationSnapshot,
	getSalesRequestConfigurationSource,
	getSalesRequestConfigurationStructuralRevision,
	getSalesRequestGenerationAdminSettings,
} from "./sales-request-configuration";

type FixtureState = {
	meta: unknown;
	steps: Array<{ id: number; uid: string; title: string; meta?: unknown }>;
	rootComponents: Array<{
		id: number;
		uid: string;
		name: string;
		meta: unknown;
		redirectUid: string | null;
		custom?: boolean | null;
		sortIndex?: number | null;
		dykeStepId: number;
		step: { id: number; uid: string; title: string };
	}>;
	components: Array<{
		id: number;
		uid: string;
		name: string;
		meta: unknown;
		redirectUid: string | null;
		custom?: boolean | null;
		isDefault?: boolean;
		sortIndex?: number | null;
		createdAt?: Date | string | null;
		metric?: { selectionCount?: number | null } | null;
		dykeStepId: number;
	}>;
};

function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function fixture(
	duplicate = false,
	configuredDefault = false,
	config: Record<string, unknown> = {},
) {
	const state: FixtureState = {
		meta: {
			route: {
				exterior: {
					routeSequence: [{ uid: "frame" }],
					config,
					...(configuredDefault
						? { requestGeneration: { defaults: { frame: "pvc" } } }
						: {}),
				},
			},
		},
		steps: [
			{ id: 20, uid: "frame", title: "Frame" },
			...(duplicate ? [{ id: 21, uid: "frame", title: "Wrong family" }] : []),
		],
		rootComponents: [
			{
				id: 100,
				uid: "exterior",
				name: "Exterior",
				meta: {},
				redirectUid: null,
				custom: false,
				dykeStepId: 1,
				step: { id: 1, uid: "type", title: "Item Type" },
			},
		],
		components: [
			{
				id: 101,
				uid: "pvc",
				name: "PVC",
				meta: {},
				redirectUid: null,
				custom: false,
				dykeStepId: 20,
			},
		],
	};
	const settings = mock(async () => ({ id: 3, meta: clone(state.meta) }));
	const steps = mock(async () => clone(state.steps));
	const components = mock(
		async (query: {
			where: { uid?: unknown };
			select?: Record<string, unknown>;
		}) =>
			query.where.uid ? clone(state.rootComponents) : clone(state.components),
	);
	// Model only this repository's read surface; no database connection is used.
	const db = {
		settings: { findFirst: settings },
		dykeSteps: { findMany: steps },
		dykeStepProducts: { findMany: components },
	} as unknown as PrismaClient;
	return { db, settings, steps, components, state };
}

function memoryCache() {
	const values = new Map<
		string,
		{ scope: string; revision: string; content: string }
	>();
	const calls = { get: 0, set: 0 };
	const key = (scope: string, revision: string) => `${scope}\u0000${revision}`;
	const cache: SalesRequestConfigurationCache = {
		get: async ({ scope, revision }) => {
			calls.get += 1;
			return values.get(key(scope, revision));
		},
		set: async (artifact) => {
			calls.set += 1;
			values.set(key(artifact.scope, artifact.revision), artifact);
		},
	};
	return { cache, calls, values };
}

test("Prisma reads are scoped by explicit settings and resolved configured step IDs", async () => {
	const { db, settings, steps, components } = fixture();
	const source = await getSalesRequestConfigurationSource(db, 3);
	expect(settings).toHaveBeenCalledWith({
		where: { id: 3, type: "sales-settings", deletedAt: null },
		select: { id: true, meta: true },
	});
	expect(steps).toHaveBeenCalledWith({
		where: { uid: { in: ["frame"] }, deletedAt: null },
		select: { id: true, uid: true, title: true, meta: true },
	});
	expect(components.mock.calls[1]?.[0].where).toEqual({
		dykeStepId: { in: [20] },
		deletedAt: null,
		step: { deletedAt: null },
	});
	expect(components.mock.calls[1]?.[0].select?.custom).toBe(true);
	expect(JSON.stringify(components.mock.calls)).not.toContain("price");
	expect(source.components.map((component) => component.uid)).toEqual(["pvc"]);
});

test("duplicate configured steps resolve to the highest active numeric ID", async () => {
	const { db, components } = fixture(true);
	await getSalesRequestConfigurationSource(db, 3);
	expect(components.mock.calls[1]?.[0].where).toEqual({
		dykeStepId: { in: [21] },
		deletedAt: null,
		step: { deletedAt: null },
	});
});

test("snapshot binds model candidates and validation rules to one structural revision", async () => {
	const first = await getSalesRequestConfigurationSnapshot(fixture().db, {
		settingId: 3,
	});
	const second = await getSalesRequestConfigurationSnapshot(fixture().db, {
		settingId: 3,
	});
	expect(first.revision).toBe(second.revision);
	expect(first.revision).toMatch(/^[a-f0-9]{64}$/);
	expect(first.scope).toBe("sales-settings:3");
	expect(first.settingId).toBe(3);
	expect(
		JSON.parse(first.configurationJson).steps.find(
			(step: { uid: string }) => step.uid === "frame",
		).components,
	).toEqual([["pvc", "PVC"]]);
});

test("admin projection preserves route order and reports repairable default diagnostics without prices", async () => {
	const state = fixture(false, true);
	state.state.meta = {
		route: {
			zeta: {
				routeSequence: [{ uid: "frame" }],
				requestGeneration: {
					defaults: { frame: "missing-component" },
				},
			},
			alpha: {
				routeSequence: [{ uid: "frame" }],
				requestGeneration: {
					defaults: { frame: "pvc" },
				},
			},
		},
	};
	const projection = await getSalesRequestGenerationAdminSettings(state.db, {
		settingId: 3,
	});

	expect(projection.routes.map((route) => route.rootUid)).toEqual([
		"alpha",
		"zeta",
	]);
	expect(projection.routes[0]?.steps[0]).toMatchObject({
		uid: "frame",
		defaultComponentUid: "pvc",
		candidates: [{ uid: "pvc", title: "PVC" }],
		warnings: [],
	});
	expect(projection.routes[1]?.steps[0]).toMatchObject({
		uid: "frame",
		defaultComponentUid: "missing-component",
		warnings: [expect.objectContaining({ code: "stale", repairable: true })],
	});
	expect(JSON.stringify(projection)).not.toMatch(/price|amount|cost/i);
});

test("admin projection distinguishes deleted, dependency-ineligible, and provably hidden defaults", async () => {
	const deleted = fixture(false, true);
	const deletedComponent = deleted.state.components[0];
	if (!deletedComponent) throw new Error("Expected deleted test component");
	deletedComponent.meta = { deletedAt: "2026-09-12T00:00:00.000Z" };
	const deletedProjection = await getSalesRequestGenerationAdminSettings(
		deleted.db,
		{ settingId: 3 },
	);
	expect(deletedProjection.routes[0]?.steps[0]?.warnings).toEqual([
		expect.objectContaining({ code: "deleted", repairable: true }),
	]);

	const dependency = fixture(false, true);
	const dependencyComponent = dependency.state.components[0];
	if (!dependencyComponent)
		throw new Error("Expected dependency test component");
	dependencyComponent.meta = {
		variations: [
			{
				rules: [
					{
						stepUid: "not-configured",
						operator: "is",
						componentsUid: ["missing"],
					},
				],
			},
		],
	};
	const dependencyProjection = await getSalesRequestGenerationAdminSettings(
		dependency.db,
		{ settingId: 3 },
	);
	expect(dependencyProjection.routes[0]?.steps[0]?.warnings).toEqual([
		expect.objectContaining({
			code: "dependency-ineligible",
			repairable: true,
		}),
	]);

	const hidden = fixture(false, true);
	const hiddenComponent = hidden.state.components[0];
	if (!hiddenComponent) throw new Error("Expected hidden test component");
	hiddenComponent.meta = {
		variations: [
			{
				rules: [
					{
						stepUid: "frame",
						operator: "is",
						componentsUid: ["different-component"],
					},
				],
			},
		],
	};
	hidden.state.components.push({
		...hiddenComponent,
		id: 102,
		uid: "different-component",
		name: "Different",
	});
	const hiddenProjection = await getSalesRequestGenerationAdminSettings(
		hidden.db,
		{ settingId: 3 },
	);
	expect(hiddenProjection.routes[0]?.steps[0]?.warnings).toEqual([
		expect.objectContaining({ code: "hidden", repairable: true }),
	]);
});

test("snapshot keeps the complete active standard Moulding catalog in form order", async () => {
	const mouldingFixture = fixture();
	const first = mouldingFixture.state.components[0];
	const step = mouldingFixture.state.steps[0];
	if (!first || !step) throw new Error("Fixture is incomplete");
	step.title = "Moulding";
	first.sortIndex = 2;
	mouldingFixture.state.components.push({
		...first,
		id: 102,
		uid: "casing",
		name: "Casing",
		sortIndex: 1,
		metric: { selectionCount: 0 },
	});

	const snapshot = await getSalesRequestConfigurationSnapshot(
		mouldingFixture.db,
		{ settingId: 3 },
	);
	const payload = JSON.parse(snapshot.configurationJson);
	expect(
		payload.steps.find(
			(candidate: { uid: string }) => candidate.uid === "frame",
		)?.components,
	).toEqual([
		["casing", "Casing"],
		["pvc", "PVC"],
	]);
});

test("excludes persisted custom rows and projects sparse step capability", async () => {
	const plainFixture = fixture();
	const customFixture = fixture();
	const customComponent = customFixture.state.components[0];
	if (!customComponent) throw new Error("Fixture component is missing");
	customFixture.state.components.push({
		...customComponent,
		id: customComponent.id + 1,
		uid: "persisted-custom",
		name: "Persisted custom",
		custom: true,
	});
	customFixture.state.steps[0] = {
		...(customFixture.state.steps[0] as {
			id: number;
			uid: string;
			title: string;
		}),
		meta: { custom: true },
	};

	const plain = await getSalesRequestConfigurationSnapshot(plainFixture.db, {
		settingId: 3,
	});
	const custom = await getSalesRequestConfigurationSnapshot(customFixture.db, {
		settingId: 3,
	});

	const plainPayload = JSON.parse(plain.configurationJson);
	const customPayload = JSON.parse(custom.configurationJson);
	expect(plainPayload.componentColumns).toEqual(["uid", "title"]);
	expect(
		plainPayload.steps.find((step: { uid: string }) => step.uid === "frame")
			?.components,
	).toEqual([["pvc", "PVC"]]);
	expect(
		customPayload.steps.find((step: { uid: string }) => step.uid === "frame")
			?.components,
	).toEqual([["pvc", "PVC"]]);
	expect(
		customPayload.steps.find((step: { uid: string }) => step.uid === "frame")
			?.custom,
	).toBe(true);
	expect(custom.configurationJson).not.toContain('"custom":false');
	expect(custom.configurationJson).not.toContain('["pvc","PVC",true]');
	expect(custom.configurationJson).not.toContain("persisted-custom");
	expect(customPayload.visibilityByComponentUid).toEqual({});
});

test("persisted custom rows do not change the structural revision", async () => {
	const plainFixture = fixture();
	const customFixture = fixture();
	const customComponent = customFixture.state.components[0];
	if (!customComponent) throw new Error("Fixture component is missing");
	customFixture.state.components.push({
		...customComponent,
		id: customComponent.id + 1,
		uid: "persisted-custom",
		name: "Persisted custom",
		custom: true,
	});

	const plainRevision = await getSalesRequestConfigurationStructuralRevision(
		plainFixture.db,
		{ settingId: 3 },
	);
	const customRevision = await getSalesRequestConfigurationStructuralRevision(
		customFixture.db,
		{ settingId: 3 },
	);

	expect(customRevision).toBe(plainRevision);
});

test("persisted component order participates in structural revision identity", async () => {
	const firstFixture = fixture();
	const secondFixture = fixture();
	const component = secondFixture.state.components[0];
	if (!component) throw new Error("Fixture component is missing");
	component.sortIndex = 10;

	const firstRevision = await getSalesRequestConfigurationStructuralRevision(
		firstFixture.db,
		{ settingId: 3 },
	);
	const secondRevision = await getSalesRequestConfigurationStructuralRevision(
		secondFixture.db,
		{ settingId: 3 },
	);
	expect(secondRevision).not.toBe(firstRevision);
});

test("changing a component default changes candidate order and the snapshot revision", async () => {
	const current = fixture();
	current.state.components.push({ ...current.state.components[0]!, id: 102, uid: "wood", name: "Wood" });
	const plain = await getSalesRequestConfigurationSnapshot(current.db, {
		settingId: 3,
	});
	current.state.components[1]!.isDefault = true;
	const defaults = await getSalesRequestConfigurationSnapshot(
		current.db,
		{ settingId: 3 },
	);
	expect(defaults.revision).not.toBe(plain.revision);
	const wire = JSON.parse(defaults.configurationJson);
	expect(wire.steps.find((step: { uid: string }) => step.uid === "frame").components[0]).toEqual(["wood", "Wood"]);
	expect(defaults.configuration.routes[0]?.defaults).toBeUndefined();
});

test("route shape flags affect revision but route prices never enter the payload", async () => {
	const base = await getSalesRequestConfigurationSnapshot(
		fixture(false, false, { hasSwing: true, price: 10 }).db,
		{ settingId: 3 },
	);
	const priceOnly = await getSalesRequestConfigurationSnapshot(
		fixture(false, false, { hasSwing: true, price: 99 }).db,
		{ settingId: 3 },
	);
	const shape = await getSalesRequestConfigurationSnapshot(
		fixture(false, false, { hasSwing: false, price: 10 }).db,
		{ settingId: 3 },
	);
	expect(priceOnly.revision).toBe(base.revision);
	expect(shape.revision).not.toBe(base.revision);
	expect(base.configurationJson).toContain('"hasSwing":true');
	expect(base.configurationJson).not.toContain('"price"');
});

test("legacy and fulfillment route settings do not enter the AI configuration", async () => {
	const snapshot = await getSalesRequestConfigurationSnapshot(
		fixture(false, false, {
			noHandle: true,
			hasSwing: false,
			addonQty: true,
			shelfLineItems: true,
			production: true,
			shipping: true,
			price: 20,
		}).db,
		{ settingId: 3 },
	);
	const config = JSON.parse(snapshot.configurationJson).routes[0].config;
	expect(config).toEqual({ noHandle: true, hasSwing: false });
});

test("cache hit rechecks the structural revision without rebuilding the projection", async () => {
	const fixtureState = fixture();
	const memory = memoryCache();
	const first = await getSalesRequestConfigurationSnapshot(
		fixtureState.db,
		{ settingId: 3 },
		{ cache: memory.cache },
	);
	const settingsAfterFirst = fixtureState.settings.mock.calls.length;
	const second = await getSalesRequestConfigurationSnapshot(
		fixtureState.db,
		{ settingId: 3 },
		{ cache: memory.cache },
	);

	expect(second.configurationJson).toBe(first.configurationJson);
	expect(memory.calls.set).toBe(1);
	// A hit performs the initial and final structural probes only; a miss also
	// performs the full projection and therefore reads settings twice more.
	expect(fixtureState.settings.mock.calls.length - settingsAfterFirst).toBe(2);
});

test("a cached snapshot is rejected when freshness confirmation fails after bounded retries", async () => {
	const fixtureState = fixture();
	const memory = memoryCache();
	await getSalesRequestConfigurationSnapshot(
		fixtureState.db,
		{ settingId: 3 },
		{ cache: memory.cache },
	);

	let componentReads = 0;
	fixtureState.components.mockImplementation(async (query) => {
		componentReads += 1;
		if (componentReads > 2) throw new Error("database freshness probe failed");
		return query.where.uid
			? clone(fixtureState.state.rootComponents)
			: clone(fixtureState.state.components);
	});

	await expect(
		getSalesRequestConfigurationSnapshot(
			fixtureState.db,
			{ settingId: 3 },
			{ cache: memory.cache },
		),
	).rejects.toThrow("freshness could not be confirmed");
	expect(componentReads).toBe(5);
});

test("a newly built snapshot is rejected when its freshness confirmation fails", async () => {
	const fixtureState = fixture();
	const memory = memoryCache();
	let componentReads = 0;
	fixtureState.components.mockImplementation(async (query) => {
		componentReads += 1;
		if (componentReads > 4) throw new Error("database freshness probe failed");
		return query.where.uid
			? clone(fixtureState.state.rootComponents)
			: clone(fixtureState.state.components);
	});

	await expect(
		getSalesRequestConfigurationSnapshot(
			fixtureState.db,
			{ settingId: 3 },
			{ cache: memory.cache },
		),
	).rejects.toThrow("freshness could not be confirmed");
	expect(memory.calls.set).toBe(0);
	expect(componentReads).toBe(7);
});

test("structural changes publish a new cache artifact while price-only edits hit", async () => {
	const scenarios: Array<{
		name: string;
		mutate: (state: FixtureState) => void;
	}> = [
		{
			name: "title",
			mutate: (state) => {
				const component = state.components[0];
				if (!component) throw new Error("Fixture component is missing");
				component.name = "PVC Updated";
			},
		},
		{
			name: "add",
			mutate: (state) => {
				state.components.push({
					id: 102,
					uid: "wood",
					name: "Wood",
					meta: {},
					redirectUid: null,
					createdAt: new Date(),
					dykeStepId: 20,
				});
			},
		},
		{
			name: "delete",
			mutate: (state) => {
				state.components.splice(0, 1);
			},
		},
		{
			name: "route",
			mutate: (state) => {
				const meta = state.meta as {
					route: { exterior: { config: unknown } };
				};
				meta.route.exterior.config = { hasSwing: true };
			},
		},
		{
			name: "default",
			mutate: (state) => {
				state.components[1]!.isDefault = true;
			},
		},
		{
			name: "visibility",
			mutate: (state) => {
				const component = state.components[0];
				if (!component) throw new Error("Fixture component is missing");
				component.meta = {
					variations: [
						{
							rules: [
								{
									stepUid: "frame",
									operator: "is",
									componentsUid: ["pvc"],
								},
							],
						},
					],
				};
			},
		},
		{
			name: "door-size-variation",
			mutate: (state) => {
				const step = state.steps[0];
				if (!step) throw new Error("Fixture step is missing");
				step.meta = {
					doorSizeVariation: [
						{
							rules: [
								{
									stepUid: "frame",
									operator: "is",
									componentsUid: ["pvc"],
								},
							],
							widthList: ["2-4", "2-10", "3-0"],
						},
					],
				};
			},
		},
	];

	for (const scenario of scenarios) {
		const fixtureState = fixture();
		if (scenario.name === "default") {
			fixtureState.state.components.push({ ...fixtureState.state.components[0]!, id: 102, uid: "wood", name: "Wood" });
		}
		const memory = memoryCache();
		const first = await getSalesRequestConfigurationSnapshot(
			fixtureState.db,
			{ settingId: 3 },
			{ cache: memory.cache },
		);
		const initialWrites = memory.calls.set;
		scenario.mutate(fixtureState.state);
		const second = await getSalesRequestConfigurationSnapshot(
			fixtureState.db,
			{ settingId: 3 },
			{ cache: memory.cache },
		);

		expect(second.revision, scenario.name).not.toBe(first.revision);
		expect(memory.calls.set, scenario.name).toBe(initialWrites + 1);
	}

	const priceFixture = fixture(false, false, { hasSwing: true, price: 10 });
	const priceMemory = memoryCache();
	const priceFirst = await getSalesRequestConfigurationSnapshot(
		priceFixture.db,
		{ settingId: 3 },
		{ cache: priceMemory.cache },
	);
	(
		priceFixture.state.meta as {
			route: { exterior: { config: Record<string, unknown> } };
		}
	).route.exterior.config.price = 99;
	const priceSecond = await getSalesRequestConfigurationSnapshot(
		priceFixture.db,
		{ settingId: 3 },
		{ cache: priceMemory.cache },
	);
	expect(priceSecond.revision).toBe(priceFirst.revision);
	expect(priceMemory.calls.set).toBe(1);
});

test("a structural change during a build retries and never returns the old artifact", async () => {
	const fixtureState = fixture();
	let componentCallCount = 0;
	fixtureState.components.mockImplementation(
		async (query: { where: { uid?: unknown } }) => {
			componentCallCount += 1;
			const result = query.where.uid
				? clone(fixtureState.state.rootComponents)
				: clone(fixtureState.state.components);
			if (componentCallCount === 2) {
				const component = fixtureState.state.components[0];
				if (!component) throw new Error("Fixture component is missing");
				component.name = "PVC Concurrent Update";
			}
			return result;
		},
	);
	const memory = memoryCache();
	const snapshot = await getSalesRequestConfigurationSnapshot(
		fixtureState.db,
		{ settingId: 3 },
		{ cache: memory.cache },
	);

	expect(snapshot.configurationJson).toContain("PVC Concurrent Update");
	expect(memory.calls.set).toBe(1);
});

test("cache outage falls back to a fresh database projection", async () => {
	const fixtureState = fixture();
	const calls = { get: 0, set: 0 };
	const cache: SalesRequestConfigurationCache = {
		get: async () => {
			calls.get += 1;
			throw new Error("redis unavailable");
		},
		set: async () => {
			calls.set += 1;
			throw new Error("redis unavailable");
		},
	};

	const snapshot = await getSalesRequestConfigurationSnapshot(
		fixtureState.db,
		{ settingId: 3 },
		{ cache },
	);

	expect(snapshot.configurationJson).toContain('"schemaVersion":1');
	expect(calls.get).toBe(1);
	expect(calls.set).toBe(1);
});
