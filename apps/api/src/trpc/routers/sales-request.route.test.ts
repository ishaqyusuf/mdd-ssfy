import { expect, test } from "bun:test";
import { getSalesRequestConfigurationContext } from "@api/services/sales-request-configuration-context";
import { getSalesRequestAISettings } from "@gnd/settings";

import { salesRequestRouter } from "./sales-request.route";

type SalesRequestCallerContext = Parameters<
	typeof salesRequestRouter.createCaller
>[0];

function superAdmin() {
	return {
		roles: [{ role: { name: "Super Admin", RoleHasPermissions: [] } }],
	};
}

function requestContext(initialMeta?: unknown, userRecord = superAdmin()) {
	let savedMeta: unknown = initialMeta ?? {
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
	const db = {
		users: {
			findFirst: async () => userRecord,
			findMany: async ({ where }: { where: { id: { in: number[] } } }) =>
				where.id.in.map((id) => ({ id })),
		},
		modelHasPermissions: { findMany: async () => [] },
		settings,
		dykeSteps: {
			findMany: async ({
				where,
			}: {
				where: { uid: string | { in: string[] } };
			}) =>
				(typeof where.uid === "string" ? [where.uid] : where.uid.in).map(
					(uid, index) => ({
						id: 11 + index,
						uid,
						title: "Frame",
						meta: {},
					}),
				),
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
		salesOrders: { findMany: async () => [] },
		$queryRaw: async () => [{ id: 7 }],
		$transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
			callback(db),
	};

	return {
		ctx: { userId: 19, db } as unknown as SalesRequestCallerContext,
		getSavedMeta: () => savedMeta,
		getActiveSettingsReads: () => activeSettingsReads,
		getSettingsUpdates: () => settingsUpdates,
		transaction: db,
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
		providerBenchmark: {
			approval: null,
			approved: false,
			current: false,
			source: "missing",
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

test("preview validation rejects a disabled feature before reading permissions or configuration", async () => {
	let databaseRead = false;
	const caller = salesRequestRouter.createCaller({
		userId: 19,
		db: {
			users: {
				findFirst: async () => {
					databaseRead = true;
					return superAdmin();
				},
			},
		},
	} as unknown as SalesRequestCallerContext);
	const previousFlag = process.env.SALES_REQUEST_AI_ENABLED;
	process.env.SALES_REQUEST_AI_ENABLED = "false";

	await expect(
		caller.validatePreview({
			type: "order",
			configurationScope: "sales-settings:7",
			configurationRevision: "a".repeat(64),
			provider: "openai",
			model: "gpt-5-mini",
		}),
	).rejects.toBeDefined();
	if (previousFlag === undefined)
		process.env.SALES_REQUEST_AI_ENABLED = undefined;
	else process.env.SALES_REQUEST_AI_ENABLED = previousFlag;
	expect(databaseRead).toBe(false);
});

test("preview validation accepts only the current server-derived identity", async () => {
	const fixture = requestContext({
		unrelated: { preserve: true },
		route: {
			root: {
				routeSequence: [{ uid: "step" }],
				requestGeneration: { defaults: {} },
			},
		},
		requestGeneration: {
			pilot: {
				enabled: true,
				cohortUserIds: [19],
				reviewerUserIds: [42],
				revision: 1,
				changedAt: "2026-09-13T12:00:00.000Z",
			},
		},
	});
	const caller = salesRequestRouter.createCaller(fixture.ctx);
	const previousFlag = process.env.SALES_REQUEST_AI_ENABLED;
	process.env.SALES_REQUEST_AI_ENABLED = "true";
	const transaction = fixture.transaction as Parameters<
		typeof getSalesRequestConfigurationContext
	>[0];
	const [snapshot, aiSettings] = await Promise.all([
		getSalesRequestConfigurationContext(transaction, { settingId: 7 }),
		getSalesRequestAISettings(transaction, 7),
	]);
	const current = {
		type: "order" as const,
		configurationScope: snapshot.scope,
		configurationRevision: snapshot.revision,
		provider: aiSettings.selection.provider,
		model: aiSettings.selection.model,
	};

	try {
		await expect(caller.validatePreview(current)).resolves.toEqual(current);
		await expect(
			caller.validatePreview({
				...current,
				configurationRevision: "0".repeat(64),
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });
	} finally {
		if (previousFlag === undefined)
			process.env.SALES_REQUEST_AI_ENABLED = undefined;
		else process.env.SALES_REQUEST_AI_ENABLED = previousFlag;
	}
});

test("text pilot rejects image payloads before database or provider work", async () => {
	const fixture = requestContext();
	const caller = salesRequestRouter.createCaller(fixture.ctx);

	await expect(
		caller.generatePreview({
			type: "order",
			text: "Customer needs one door.",
			images: [{ mediaType: "image/png", base64: "AAAA" }],
		}),
	).rejects.toMatchObject({ code: "BAD_REQUEST" });
	expect(fixture.getActiveSettingsReads()).toBe(0);
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

test("benchmark approval is Super Admin-authored and bound to current runtime identity", async () => {
	const fixture = requestContext({
		unrelated: { preserve: true },
		route: {
			root: {
				routeSequence: [{ uid: "step" }],
				requestGeneration: { defaults: {} },
			},
		},
		requestGeneration: {
			ai: { provider: "openai", model: "gpt-5-mini" },
		},
	});
	const caller = salesRequestRouter.createCaller(fixture.ctx);
	const benchmarkSnapshot = await getSalesRequestConfigurationContext(
		fixture.transaction as Parameters<
			typeof getSalesRequestConfigurationContext
		>[0],
		{ settingId: 7 },
	);
	const decision = {
		approved: true,
		provider: "openai" as const,
		model: "gpt-5-mini",
		evaluationRunId: "2026-09-13T120000Z-openai-v1",
		corpusVersion: "sales-request-text-v1",
		policyVersion: "pilot-gates-v1",
		configurationRevision: benchmarkSnapshot.revision,
		promptVersion: "new-sales-form-seed-v6",
		schemaVersion: 2,
		evidenceDigest: `sha256:${"a".repeat(64)}`,
	};

	await expect(
		caller.updateProviderBenchmarkApproval(decision),
	).resolves.toMatchObject({
		changed: true,
		approved: true,
		approval: {
			...decision,
			approvedByUserId: 19,
			revision: 1,
			approvedAt: expect.any(String),
		},
	});
	expect(fixture.getSettingsUpdates()).toBe(1);
	expect(fixture.getSavedMeta()).toMatchObject({
		unrelated: { preserve: true },
		requestGeneration: {
			ai: { provider: "openai", model: "gpt-5-mini" },
			providerBenchmarkApproval: {
				...decision,
				approvedByUserId: 19,
				revision: 1,
			},
		},
	});
});

test("benchmark approval rejects stale configuration evidence before writing", async () => {
	const fixture = requestContext({
		route: {
			root: {
				routeSequence: [{ uid: "step" }],
				requestGeneration: { defaults: {} },
			},
		},
		requestGeneration: {
			ai: { provider: "openai", model: "gpt-5-mini" },
		},
	});
	const caller = salesRequestRouter.createCaller(fixture.ctx);
	const benchmarkSnapshot = await getSalesRequestConfigurationContext(
		fixture.transaction as Parameters<
			typeof getSalesRequestConfigurationContext
		>[0],
		{ settingId: 7 },
	);

	await expect(
		caller.updateProviderBenchmarkApproval({
			approved: true,
			provider: "openai",
			model: "gpt-5-mini",
			evaluationRunId: "run-1",
			corpusVersion: "sales-request-text-v1",
			policyVersion: "pilot-gates-v1",
			configurationRevision: "0".repeat(64),
			promptVersion: "new-sales-form-seed-v6",
			schemaVersion: 2,
			evidenceDigest: `sha256:${"a".repeat(64)}`,
		}),
	).rejects.toMatchObject({ code: "CONFLICT" });
	await expect(
		caller.updateProviderBenchmarkApproval({
			approved: true,
			provider: "openai",
			model: "gpt-5-mini",
			evaluationRunId: "run-1",
			corpusVersion: "sales-request-text-v1",
			policyVersion: "pilot-gates-v1",
			configurationRevision: benchmarkSnapshot.revision,
			promptVersion: "new-sales-form-seed-v5",
			schemaVersion: 2,
			evidenceDigest: `sha256:${"a".repeat(64)}`,
		}),
	).rejects.toMatchObject({ code: "CONFLICT" });
	await expect(
		caller.updateProviderBenchmarkApproval({
			approved: true,
			provider: "openai",
			model: "gpt-5-mini",
			evaluationRunId: "run-1",
			corpusVersion: "sales-request-text-v1",
			policyVersion: "pilot-gates-v1",
			configurationRevision: benchmarkSnapshot.revision,
			promptVersion: "new-sales-form-seed-v6",
			schemaVersion: 1,
			evidenceDigest: `sha256:${"a".repeat(64)}`,
		}),
	).rejects.toMatchObject({ code: "CONFLICT" });
	await expect(
		caller.updateProviderBenchmarkApproval({
			approved: true,
			provider: "openai",
			model: "gpt-5-mini",
			evaluationRunId: "run-1",
			corpusVersion: "sales-request-text-v2",
			policyVersion: "pilot-gates-v1",
			configurationRevision: benchmarkSnapshot.revision,
			promptVersion: "new-sales-form-seed-v6",
			schemaVersion: 2,
			evidenceDigest: `sha256:${"a".repeat(64)}`,
		}),
	).rejects.toMatchObject({ code: "CONFLICT" });
	await expect(
		caller.updateProviderBenchmarkApproval({
			approved: true,
			provider: "openai",
			model: "gpt-5-mini",
			evaluationRunId: "run-1",
			corpusVersion: "sales-request-text-v1",
			policyVersion: "pilot-gates-v2",
			configurationRevision: benchmarkSnapshot.revision,
			promptVersion: "new-sales-form-seed-v6",
			schemaVersion: 2,
			evidenceDigest: `sha256:${"a".repeat(64)}`,
		}),
	).rejects.toMatchObject({ code: "CONFLICT" });
	expect(fixture.getSettingsUpdates()).toBe(0);
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
	await expect(
		caller.updateProviderBenchmarkApproval({
			approved: true,
			provider: "openai",
			model: "gpt-5-mini",
			evaluationRunId: "run-1",
			corpusVersion: "sales-request-text-v1",
			policyVersion: "pilot-gates-v1",
			configurationRevision: "c".repeat(64),
			promptVersion: "new-sales-form-seed-v6",
			schemaVersion: 2,
			evidenceDigest: `sha256:${"a".repeat(64)}`,
		}),
	).rejects.toMatchObject({ code: "FORBIDDEN" });
	expect(settingsRead).toBe(false);
});

test("pilot access exposes only safe eligibility state for a configured create form", async () => {
	const fixture = requestContext({
		requestGeneration: {
			pilot: {
				enabled: true,
				cohortUserIds: [19],
				reviewerUserIds: [42],
				revision: 2,
				changedAt: "2026-09-13T12:00:00.000Z",
			},
		},
	});
	const caller = salesRequestRouter.createCaller(fixture.ctx);
	const previousFlag = process.env.SALES_REQUEST_AI_ENABLED;
	process.env.SALES_REQUEST_AI_ENABLED = "true";

	try {
		await expect(
			caller.getPilotAccess({ type: "order" }),
		).resolves.toMatchObject({
			featureEnabled: true,
			pilotEnabled: true,
			eligible: true,
			cohortMember: true,
			reviewer: false,
			settingsRevision: 2,
			reason: "eligible",
		});
	} finally {
		if (previousFlag === undefined)
			process.env.SALES_REQUEST_AI_ENABLED = undefined;
		else process.env.SALES_REQUEST_AI_ENABLED = previousFlag;
	}
});

test("pilot access hides generation from enrolled users without native sales authority", async () => {
	const fixture = requestContext(
		{
			requestGeneration: {
				pilot: {
					enabled: true,
					cohortUserIds: [19],
					reviewerUserIds: [42],
					revision: 2,
					changedAt: "2026-09-13T12:00:00.000Z",
				},
			},
		},
		{ roles: [] },
	);
	const caller = salesRequestRouter.createCaller(fixture.ctx);
	const previousFlag = process.env.SALES_REQUEST_AI_ENABLED;
	process.env.SALES_REQUEST_AI_ENABLED = "true";

	try {
		await expect(
			caller.getPilotAccess({ type: "quote" }),
		).resolves.toMatchObject({
			eligible: false,
			cohortMember: true,
			reason: "permission",
		});
	} finally {
		if (previousFlag === undefined)
			process.env.SALES_REQUEST_AI_ENABLED = undefined;
		else process.env.SALES_REQUEST_AI_ENABLED = previousFlag;
	}
});

test("pilot settings mutation is Super Admin-only and preserves existing sales metadata", async () => {
	const fixture = requestContext();
	const caller = salesRequestRouter.createCaller(fixture.ctx);

	const result = await caller.updatePilotSettings({
		enabled: true,
		cohortUserIds: [19, 7, 19],
		reviewerUserIds: [42],
	});

	expect(result).toMatchObject({
		changed: true,
		settingId: 7,
		settings: {
			enabled: true,
			cohortUserIds: [7, 19],
			reviewerUserIds: [42],
			revision: 1,
		},
		source: "persisted",
	});
	expect(fixture.getSavedMeta()).toMatchObject({
		unrelated: { preserve: true },
		requestGeneration: {
			pilot: {
				enabled: true,
				cohortUserIds: [7, 19],
				reviewerUserIds: [42],
			},
		},
		route: {
			root: {
				routeSequence: [{ uid: "step" }],
			},
		},
	});
});

test("pilot settings reject deleted, revoked, or unknown named users", async () => {
	const fixture = requestContext();
	fixture.transaction.users.findMany = async () => [{ id: 19 }];
	const caller = salesRequestRouter.createCaller(fixture.ctx);

	await expect(
		caller.updatePilotSettings({
			enabled: true,
			cohortUserIds: [19, 77],
			reviewerUserIds: [42],
		}),
	).rejects.toThrow("Review the information provided and try again.");
	expect(fixture.getSettingsUpdates()).toBe(0);
});

test("pilot rollback can disable even when prior named users are no longer active", async () => {
	const fixture = requestContext();
	fixture.transaction.users.findMany = async () => [];
	const caller = salesRequestRouter.createCaller(fixture.ctx);

	await expect(
		caller.updatePilotSettings({
			enabled: false,
			cohortUserIds: [77],
			reviewerUserIds: [42],
		}),
	).resolves.toMatchObject({
		changed: true,
		settings: { enabled: false },
	});
	expect(fixture.getSettingsUpdates()).toBe(1);
});

test("preview refuses an unconfigured pilot before any provider work", async () => {
	const fixture = requestContext();
	const caller = salesRequestRouter.createCaller(fixture.ctx);
	const previousFlag = process.env.SALES_REQUEST_AI_ENABLED;
	process.env.SALES_REQUEST_AI_ENABLED = "true";

	try {
		await expect(
			caller.generatePreview({ type: "quote", text: "request text" }),
		).rejects.toMatchObject({
			code: "CONFLICT",
			message:
				"This record changed before your request completed. Refresh and try again.",
		});
	} finally {
		if (previousFlag === undefined)
			process.env.SALES_REQUEST_AI_ENABLED = undefined;
		else process.env.SALES_REQUEST_AI_ENABLED = previousFlag;
	}
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

test("generation outcome writes are actor-bound and expose no source payload", async () => {
	const calls: unknown[] = [];
	const caller = salesRequestRouter.createCaller({
		userId: 7,
		db: {
			salesRequestGenerationRun: {
				findUnique: async () => ({
					generationId: "11111111-1111-4111-8111-111111111111",
					actorUserId: 7,
					retentionUntil: new Date("2026-12-11T12:00:00.000Z"),
					deletedAt: null,
					applyOutcome: null,
					completedAt: new Date("2026-09-12T11:59:00.000Z"),
					correctionMs: null,
				}),
				updateMany: async (input: unknown) => {
					calls.push(input);
					return { count: 1 };
				},
			},
			users: { findFirst: async () => superAdmin() },
		},
	} as unknown as SalesRequestCallerContext);

	await expect(
		caller.recordOutcome({
			generationId: "11111111-1111-4111-8111-111111111111",
			kind: "apply",
			outcome: "applied",
		}),
	).resolves.toMatchObject({ recorded: true });
	expect(JSON.stringify(calls)).not.toMatch(
		/source|image|contact|providerBody/i,
	);
});

test("pilot summary remains Super Admin-only and aggregate-only", async () => {
	let readCount = 0;
	const ordinary = salesRequestRouter.createCaller({
		userId: 19,
		db: {
			users: {
				findFirst: async () => ({ roles: [{ role: { name: "Sales" } }] }),
			},
			salesRequestGenerationRun: {
				findMany: async () => {
					readCount += 1;
					return [];
				},
			},
		},
	} as unknown as SalesRequestCallerContext);

	await expect(ordinary.pilotSummary({ days: 30 })).rejects.toMatchObject({
		code: "FORBIDDEN",
	});
	expect(readCount).toBe(0);

	const admin = salesRequestRouter.createCaller({
		userId: 7,
		db: {
			users: { findFirst: async () => superAdmin() },
			salesRequestGenerationRun: {
				findMany: async () => [],
			},
		},
	} as unknown as SalesRequestCallerContext);
	const result = await admin.pilotSummary({ days: 30 });
	expect(result).toHaveProperty("generationCount", 0);
	expect(result).not.toHaveProperty("runs");
});
