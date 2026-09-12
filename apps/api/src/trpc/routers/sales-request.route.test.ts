import { expect, test } from "bun:test";

import { salesRequestRouter } from "./sales-request.route";

type SalesRequestCallerContext = Parameters<
	typeof salesRequestRouter.createCaller
>[0];

function superAdmin() {
	return { roles: [{ role: { name: "Super Admin" } }] };
}

function requestContext() {
	let savedMeta: unknown = {
		unrelated: { preserve: true },
		route: {
			root: {
				routeSequence: [{ uid: "step" }],
				requestGeneration: { defaults: {} },
			},
		},
	};
	let activeSettingsReads = 0;
	let settingsUpdates = 0;

	const settings = {
		findMany: async () => {
			activeSettingsReads += 1;
			return [{ id: 9 }, { id: 7 }];
		},
		findFirst: async () => ({ id: 7, meta: savedMeta }),
		update: async ({ data }: { data: { meta: unknown } }) => {
			settingsUpdates += 1;
			savedMeta = data.meta;
		},
	};
	const transaction = {
		$queryRaw: async () => [{ id: 7 }],
		settings,
		dykeSteps: {
			findMany: async ({ where }: { where: { uid: string } }) => [
				{ id: 11, uid: where.uid },
			],
		},
		dykeStepProducts: {
			findMany: async () => [{ uid: "component", meta: {} }],
		},
	};
	const db = {
		users: { findFirst: async () => superAdmin() },
		settings,
		dykeSteps: {
			findMany: async ({ where }: { where: { uid: { in: string[] } } }) =>
				where.uid.in.map((uid, index) => ({
					id: 11 + index,
					uid,
					title: "Frame",
					meta: {},
				})),
		},
		dykeStepProducts: {
			findMany: async ({ where }: { where: { uid?: { in: string[] } } }) =>
				where.uid
					? where.uid.in.map((uid, index) => ({
							id: 100 + index,
							uid,
							name: uid === "root" ? "Root" : "Component",
							meta: {},
							redirectUid: null,
							custom: false,
							sortIndex: null,
							createdAt: new Date("2026-01-01T00:00:00.000Z"),
							dykeStepId: uid === "root" ? 1 : 11,
							metric: { selectionCount: 1 },
							product: { title: null },
							door: { title: null },
							step: {
								id: 1,
								uid: "root-step",
								title: "Item Type",
								meta: {},
							},
						}))
					: [
							{
								id: 101,
								uid: "component",
								name: "Component",
								meta: {},
								redirectUid: null,
								custom: false,
								sortIndex: null,
								createdAt: new Date("2026-01-01T00:00:00.000Z"),
								dykeStepId: 11,
								metric: { selectionCount: 1 },
								product: { title: null },
								door: { title: null },
							},
						],
		},
		$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
			callback(transaction),
	};

	return {
		ctx: { userId: 19, db } as unknown as SalesRequestCallerContext,
		getSavedMeta: () => savedMeta,
		getActiveSettingsReads: () => activeSettingsReads,
		getSettingsUpdates: () => settingsUpdates,
	};
}

test("AI settings query is Super Admin-only and defaults an unconfigured install", async () => {
	const fixture = requestContext();
	const caller = salesRequestRouter.createCaller(fixture.ctx);

	await expect(caller.getAISettings()).resolves.toMatchObject({
		settingId: 7,
		settings: { provider: "openai", model: "gpt-5-mini" },
		source: "default",
		providers: expect.arrayContaining([
			expect.objectContaining({ id: "openai" }),
			expect.objectContaining({ id: "anthropic" }),
			expect.objectContaining({ id: "deepseek" }),
			expect.objectContaining({ id: "google" }),
		]),
		catalog: {
			policy: {
				gracePeriodDays: 90,
				pinnedComponentUids: [],
				excludedComponentUids: [],
			},
			publication: { generation: 0, status: "stale" },
		},
	});
	expect(fixture.getActiveSettingsReads()).toBe(1);
});

test("AI settings query includes price-free route defaults and revision diagnostics", async () => {
	const fixture = requestContext();
	const caller = salesRequestRouter.createCaller(fixture.ctx);

	const result = await caller.getAISettings();

	expect(result.requestGeneration).toMatchObject({
		featureEnabled: false,
		routes: [
			{
				rootUid: "root",
				steps: [
					{
						uid: "step",
						defaultComponentUid: null,
						candidates: [{ uid: "component", title: "Component" }],
						warnings: [],
					},
				],
			},
		],
	});
	expect(result.requestGeneration.configurationRevision).toMatch(
		/^[a-f0-9]{64}$/,
	);
	expect(JSON.stringify(result.requestGeneration)).not.toMatch(
		/price|amount|cost/i,
	);
});

test("AI settings mutation derives the lowest active row and preserves metadata", async () => {
	const fixture = requestContext();
	const caller = salesRequestRouter.createCaller(fixture.ctx);
	const previousKey = process.env.SALES_REQUEST_GOOGLE_API_KEY;
	process.env.SALES_REQUEST_GOOGLE_API_KEY = "test-key";

	const result = await caller
		.updateAISettings({
			provider: "google",
			model: "gemini-3.8-flash",
		})
		.finally(() => {
			if (previousKey === undefined)
				process.env.SALES_REQUEST_GOOGLE_API_KEY = undefined;
			else process.env.SALES_REQUEST_GOOGLE_API_KEY = previousKey;
		});

	expect(result).toMatchObject({
		changed: true,
		settingId: 7,
		settings: { provider: "google", model: "gemini-3.8-flash" },
		source: "persisted",
		providers: expect.arrayContaining([
			expect.objectContaining({
				id: "google",
				defaultModel: "gemini-3.8-flash",
			}),
		]),
		catalog: {
			policy: {
				gracePeriodDays: 90,
				pinnedComponentUids: [],
				excludedComponentUids: [],
			},
			publication: { generation: 0, status: "stale" },
		},
	});
	expect(fixture.getActiveSettingsReads()).toBe(1);
	expect(fixture.getSettingsUpdates()).toBe(1);
	expect(fixture.getSavedMeta()).toEqual({
		unrelated: { preserve: true },
		requestGeneration: {
			ai: { provider: "google", model: "gemini-3.8-flash" },
		},
		route: {
			root: {
				routeSequence: [{ uid: "step" }],
				requestGeneration: { defaults: {} },
			},
		},
	});
});

test("AI settings reject a provider whose server credential is missing", async () => {
	const fixture = requestContext();
	const caller = salesRequestRouter.createCaller(fixture.ctx);
	const previousKey = process.env.SALES_REQUEST_DEEPSEEK_API_KEY;
	process.env.SALES_REQUEST_DEEPSEEK_API_KEY = undefined;

	await expect(
		caller.updateAISettings({
			provider: "deepseek",
			model: "deepseek-v4-flash",
		}),
	).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
	if (previousKey !== undefined)
		process.env.SALES_REQUEST_DEEPSEEK_API_KEY = previousKey;
	expect(fixture.getActiveSettingsReads()).toBe(0);
});

test("AI settings reject unsupported provider/model pairs at the API boundary", async () => {
	const fixture = requestContext();
	const caller = salesRequestRouter.createCaller(fixture.ctx);

	await expect(
		caller.updateAISettings({
			provider: "google",
			model: "gpt-5-mini",
		}),
	).rejects.toMatchObject({ code: "BAD_REQUEST" });
	expect(fixture.getActiveSettingsReads()).toBe(0);
});

test("AI settings reject ordinary callers before selecting settings", async () => {
	let settingsRead = false;
	const caller = salesRequestRouter.createCaller({
		userId: 19,
		db: {
			users: {
				findFirst: async () => ({ roles: [{ role: { name: "Sales" } }] }),
			},
			settings: {
				findMany: async () => {
					settingsRead = true;
					return [{ id: 7 }];
				},
			},
		},
	} as unknown as SalesRequestCallerContext);

	await expect(caller.getAISettings()).rejects.toMatchObject({
		code: "FORBIDDEN",
	});
	await expect(
		caller.updateAISettings({ provider: "openai", model: "gpt-5-mini" }),
	).rejects.toMatchObject({ code: "FORBIDDEN" });
	expect(settingsRead).toBe(false);
});

test("defaults mutation is Super Admin-only and derives the active settings row", async () => {
	const fixture = requestContext();
	const caller = salesRequestRouter.createCaller(fixture.ctx);

	const result = await caller.setDefault({
		rootUid: "root",
		stepUid: "step",
		componentUid: "component",
	});

	expect(result).toMatchObject({
		changed: true,
		settingId: 7,
		rootUid: "root",
		stepUid: "step",
		componentUid: "component",
		defaults: { root: { step: "component" } },
	});
	expect(fixture.getActiveSettingsReads()).toBe(1);
	expect(fixture.getSettingsUpdates()).toBe(1);
	expect(fixture.getSavedMeta()).toEqual({
		unrelated: { preserve: true },
		route: {
			root: {
				routeSequence: [{ uid: "step" }],
				requestGeneration: { defaults: { step: "component" } },
			},
		},
	});
});

test("defaults mutation rejects unauthenticated and ordinary callers before settings selection", async () => {
	const unauthenticated = salesRequestRouter.createCaller({
		db: {},
	} as SalesRequestCallerContext);
	await expect(
		unauthenticated.setDefault({
			rootUid: "root",
			stepUid: "step",
			componentUid: null,
		}),
	).rejects.toMatchObject({ code: "UNAUTHORIZED" });

	let settingsRead = false;
	const ordinary = salesRequestRouter.createCaller({
		userId: 19,
		db: {
			users: {
				findFirst: async () => ({ roles: [{ role: { name: "Sales" } }] }),
			},
			settings: {
				findMany: async () => {
					settingsRead = true;
					return [{ id: 7 }];
				},
			},
		},
	} as unknown as SalesRequestCallerContext);
	await expect(
		ordinary.setDefault({
			rootUid: "root",
			stepUid: "step",
			componentUid: null,
		}),
	).rejects.toMatchObject({ code: "FORBIDDEN" });
	expect(settingsRead).toBe(false);
});

test("defaults mutation does not accept a client-selected settings ID", async () => {
	const fixture = requestContext();
	const caller = salesRequestRouter.createCaller(fixture.ctx);

	await expect(
		caller.setDefault({
			rootUid: "root",
			stepUid: "step",
			componentUid: null,
			settingId: 999,
		} as never),
	).rejects.toMatchObject({ code: "BAD_REQUEST" });
	expect(fixture.getActiveSettingsReads()).toBe(0);
});
