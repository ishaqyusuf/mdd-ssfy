import { describe, expect, it } from "bun:test";

import {
	getSalesRequestGenerationDefaults,
	updateSalesRequestGenerationDefault,
} from "./sales-request-generation-defaults";

const settingId = 7;

type FakeDatabaseOptions = {
	meta: unknown;
	steps?: Array<{ id: number; uid: string | null }>;
	components?: Array<{ uid: string | null; meta?: unknown }>;
};

function fakeDatabase(options: FakeDatabaseOptions) {
	let savedMeta = options.meta;
	let updateCount = 0;
	const events: string[] = [];
	const componentStepIds: number[] = [];
	const steps = options.steps ?? [
		{ id: 11, uid: "step-a" },
		{ id: 12, uid: "step-b" },
	];
	const components = options.components ?? [
		{ uid: "component-a" },
		{ uid: "component-b" },
	];

	const transactionClient = {
		$queryRaw: async () => {
			events.push("lock");
			return [{ id: settingId }];
		},
		settings: {
			findFirst: async () => {
				events.push("read");
				return { id: settingId, meta: savedMeta };
			},
			update: async ({ data }: { data: { meta: unknown } }) => {
				events.push("update");
				updateCount += 1;
				savedMeta = data.meta;
			},
		},
		dykeSteps: {
			findMany: async ({
				where,
			}: {
				where?: { uid?: string };
			}) => {
				events.push("steps");
				return where?.uid
					? steps.filter((step) => step.uid === where.uid)
					: steps;
			},
		},
		dykeStepProducts: {
			findMany: async ({
				where,
			}: {
				where: { dykeStepId: number };
			}) => {
				events.push("components");
				componentStepIds.push(where.dykeStepId);
				return components;
			},
		},
	};

	const db = {
		settings: transactionClient.settings,
		$transaction: async (
			callback: (tx: typeof transactionClient) => unknown,
			transactionOptions: unknown,
		) => {
			events.push("transaction");
			expect(transactionOptions).toEqual({
				isolationLevel: "Serializable",
				timeout: 60_000,
			});
			return callback(transactionClient);
		},
	};

	return {
		db: db as unknown as Parameters<
			typeof updateSalesRequestGenerationDefault
		>[0],
		getDb: db as unknown as Parameters<
			typeof getSalesRequestGenerationDefaults
		>[0],
		getMeta: () => savedMeta,
		getEvents: () => events,
		getComponentStepIds: () => componentStepIds,
		getUpdateCount: () => updateCount,
	};
}

function directRouteMeta() {
	return {
		unrelated: { preserved: "yes", punctuation: "!@#$%^&*()" },
		data: {
			unrelated: "nested metadata",
			route: {
				root: {
					routeSequence: [{ uid: "nested-step" }],
					requestGeneration: { defaults: { "nested-step": "nested" } },
				},
			},
		},
		route: {
			root: {
				title: "Puerta 🚪",
				routeSequence: [{ uid: "step-a" }, { uid: "step-b" }, { uid: "" }],
				requestGeneration: {
					unrelated: { keep: true },
					defaults: { "step-a": "component-a" },
				},
			},
		},
	};
}

describe("sales request-generation defaults", () => {
	it("reads direct route defaults before the nested fallback route", async () => {
		const fixture = fakeDatabase({ meta: directRouteMeta() });

		await expect(
			getSalesRequestGenerationDefaults(fixture.getDb, settingId),
		).resolves.toEqual({ root: { "step-a": "component-a" } });
	});

	it("deep-merges a direct route default and locks before reading", async () => {
		const fixture = fakeDatabase({ meta: directRouteMeta() });

		const result = await updateSalesRequestGenerationDefault(fixture.db, {
			settingId,
			rootUid: "root",
			stepUid: "step-b",
			componentUid: "component-b",
		});

		expect(result).toMatchObject({
			changed: true,
			settingId,
			rootUid: "root",
			stepUid: "step-b",
			componentUid: "component-b",
		});
		expect(result.defaults).toEqual({
			root: { "step-a": "component-a", "step-b": "component-b" },
		});
		expect(fixture.getEvents()).toEqual([
			"transaction",
			"lock",
			"read",
			"steps",
			"components",
			"update",
		]);
		expect(fixture.getMeta()).toEqual({
			unrelated: { preserved: "yes", punctuation: "!@#$%^&*()" },
			data: {
				unrelated: "nested metadata",
				route: {
					root: {
						routeSequence: [{ uid: "nested-step" }],
						requestGeneration: {
							defaults: { "nested-step": "nested" },
						},
					},
				},
			},
			route: {
				root: {
					title: "Puerta 🚪",
					routeSequence: [{ uid: "step-a" }, { uid: "step-b" }, { uid: "" }],
					requestGeneration: {
						unrelated: { keep: true },
						defaults: {
							"step-a": "component-a",
							"step-b": "component-b",
						},
					},
				},
			},
		});
	});

	it("writes to nested route metadata when direct route is empty", async () => {
		const meta = {
			data: {
				preserve: "✓",
				route: {
					root: {
						routeSequence: [{ uid: "step-a" }],
						requestGeneration: { defaults: {} },
					},
				},
			},
			route: {},
		};
		const fixture = fakeDatabase({ meta });

		await updateSalesRequestGenerationDefault(fixture.db, {
			settingId,
			rootUid: "root",
			stepUid: "step-a",
			componentUid: "component-a",
		});

		expect(fixture.getMeta()).toEqual({
			data: {
				preserve: "✓",
				route: {
					root: {
						routeSequence: [{ uid: "step-a" }],
						requestGeneration: { defaults: { "step-a": "component-a" } },
					},
				},
			},
			route: {},
		});
	});

	it("clears a default without dropping sibling defaults or metadata", async () => {
		const meta = directRouteMeta();
		(meta.route.root.requestGeneration.defaults as Record<string, string>)[
			"step-b"
		] = "component-b";
		const fixture = fakeDatabase({ meta });

		const result = await updateSalesRequestGenerationDefault(fixture.db, {
			settingId,
			rootUid: "root",
			stepUid: "step-a",
			componentUid: null,
		});

		expect(result.changed).toBe(true);
		expect(result.defaults).toEqual({
			root: { "step-b": "component-b" },
		});
		expect(fixture.getMeta()).toMatchObject({
			unrelated: { preserved: "yes" },
			route: {
				root: {
					requestGeneration: {
						unrelated: { keep: true },
						defaults: { "step-b": "component-b" },
					},
				},
			},
		});
	});

	it("does not write an already persisted value", async () => {
		const fixture = fakeDatabase({ meta: directRouteMeta() });

		const result = await updateSalesRequestGenerationDefault(fixture.db, {
			settingId,
			rootUid: "root",
			stepUid: "step-a",
			componentUid: "component-a",
		});

		expect(result.changed).toBe(false);
		expect(fixture.getUpdateCount()).toBe(0);
	});

	it("rejects duplicate route step identities before changing metadata", async () => {
		const fixture = fakeDatabase({
			meta: {
				route: {
					root: {
						routeSequence: [{ uid: "step-a" }, { uid: "step-a" }],
					},
				},
			},
		});

		await expect(
			updateSalesRequestGenerationDefault(fixture.db, {
				settingId,
				rootUid: "root",
				stepUid: "step-a",
				componentUid: "component-a",
			}),
		).rejects.toThrow("Duplicate configured route step UID: step-a");
		expect(fixture.getUpdateCount()).toBe(0);
	});

	it("uses the highest active step ID for duplicated legacy UIDs", async () => {
		const duplicateSteps = fakeDatabase({
			meta: directRouteMeta(),
			steps: [
				{ id: 12, uid: "step-a" },
				{ id: 11, uid: "step-a" },
			],
		});
		await updateSalesRequestGenerationDefault(duplicateSteps.db, {
			settingId,
			rootUid: "root",
			stepUid: "step-a",
			componentUid: "component-b",
		});
		expect(duplicateSteps.getComponentStepIds()).toEqual([12]);
		expect(duplicateSteps.getMeta()).toMatchObject({
			route: {
				root: {
					requestGeneration: { defaults: { "step-a": "component-b" } },
				},
			},
		});
	});

	it("rejects duplicate active components", async () => {
		const duplicateComponents = fakeDatabase({
			meta: directRouteMeta(),
			components: [{ uid: "component-a" }, { uid: "component-a" }],
		});
		await expect(
			updateSalesRequestGenerationDefault(duplicateComponents.db, {
				settingId,
				rootUid: "root",
				stepUid: "step-a",
				componentUid: "component-a",
			}),
		).rejects.toThrow("Duplicate active component UID: component-a");
	});

	it("rejects a component that is not active for the configured step", async () => {
		const fixture = fakeDatabase({
			meta: directRouteMeta(),
			components: [{ uid: "component-a" }],
		});

		await expect(
			updateSalesRequestGenerationDefault(fixture.db, {
				settingId,
				rootUid: "root",
				stepUid: "step-b",
				componentUid: "component-missing",
			}),
		).rejects.toThrow(
			"Component component-missing is not active in step step-b",
		);
		expect(fixture.getUpdateCount()).toBe(0);
	});

	it("rejects a component hidden by its metadata deletion marker", async () => {
		const fixture = fakeDatabase({
			meta: directRouteMeta(),
			components: [{ uid: "component-a", meta: { deletedAt: "2026-09-10" } }],
		});

		await expect(
			updateSalesRequestGenerationDefault(fixture.db, {
				settingId,
				rootUid: "root",
				stepUid: "step-a",
				componentUid: "component-a",
			}),
		).rejects.toThrow("Component component-a is not active in step step-a");
		expect(fixture.getUpdateCount()).toBe(0);
	});

	it("allows clearing a default when its component row has disappeared", async () => {
		const meta = directRouteMeta();
		const fixture = fakeDatabase({ meta, components: [] });

		const result = await updateSalesRequestGenerationDefault(fixture.db, {
			settingId,
			rootUid: "root",
			stepUid: "step-a",
			componentUid: null,
		});

		expect(result.changed).toBe(true);
		expect(result.defaults).toEqual({});
		expect(fixture.getUpdateCount()).toBe(1);
	});
});
