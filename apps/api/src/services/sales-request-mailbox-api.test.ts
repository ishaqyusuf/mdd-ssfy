import { describe, expect, test } from "bun:test";
import { AppError } from "@gnd/errors";
import { prepareMailboxModelInput } from "@gnd/sales-request-mailbox";
import type { SalesRequestAISelection } from "@gnd/settings";
import { createSalesRequestMailboxRouter } from "../trpc/routers/sales-request-mailbox.route";
import { createSalesRequestMailboxApi } from "./sales-request-mailbox-api";

const actorUserId = 42;
const connectionId = "mailbox-connection-1";
const queueIdentity = `srq1:${"a".repeat(64)}`;
const signal = new AbortController().signal;

const page = {
	items: [],
	nextCursor: null,
	statusCounts: {
		new: 0,
		processing: 0,
		"needs-review": 0,
		"ready-to-apply": 0,
		completed: 0,
		dismissed: 0,
		failed: 0,
	},
};

const detail = {
	queueIdentity,
	status: "new" as const,
	receivedAt: new Date("2026-09-13T12:00:00.000Z"),
	fromEmail: "customer@example.com",
	fromName: "Customer",
	subject: "Door quote",
	hasAttachments: false,
	displayText: "One exterior door",
	toEmails: ["sales@example.com"],
	ccEmails: [],
};

const output = {
	schemaVersion: 1,
	lineItems: [],
	unresolved: [
		{
			lineUid: null,
			stepId: null,
			field: "request",
			status: "unsupported" as const,
			reason: "No configured item route matches the request",
		},
	],
};

const snapshot = {
	settingId: 3,
	scope: "sales-settings:3",
	revision: "configuration-1",
	configurationJson: JSON.stringify({
		schemaVersion: 1,
		routes: [],
		steps: [],
		visibilityByComponentUid: {},
	}),
	configuration: {
		schemaVersion: 1 as const,
		routes: [],
		steps: [],
		visibilityByComponentUid: {},
	},
	aiSelection: {
		provider: "openai",
		model: "gpt-5-mini",
	} satisfies SalesRequestAISelection,
	pilotSettingsRevision: 1,
	providerBenchmarkApprovalRevision: 1,
};

function connectionLifecycle() {
	const calls: Record<string, unknown>[] = [];
	return {
		calls,
		store: {
			resolveStartAuthority: async (input: unknown) => {
				calls.push({ kind: "resolve", input });
				return {
					kind: "authorized" as const,
					authority: {
						ownerUserId: actorUserId,
						employeeProfileId: 10,
						organizationId: 20,
						officeAuthorityKey: "office-authority-v1:test",
						authorityRevision: "authority-1",
						salesSettingsId: 3,
						salesSettingsRevision: 1,
						policy: {
							enabled: true,
							supportedProviders: ["gmail"],
							eligibleUserIds: [actorUserId],
							retentionDays: 30,
							maximumAutomationMode: "manual",
							emergencyDisabled: false,
							allowAttachments: false,
							maxAttachmentBytes: 0,
							revision: 1,
							changedAt: null,
						},
						providerEligible: true,
					},
				};
			},
			createAttempt: async (input: unknown) => {
				calls.push({ kind: "attempt", input });
				return { kind: "created" as const };
			},
		},
		adapters: {
			gmail: {
				provider: "gmail" as const,
				createAuthorizationUrl: async ({ state }: { state: string }) =>
					`https://mail.example/connect?state=${state}`,
				exchangeAuthorizationCode: async () => {
					throw new Error("not-used");
				},
				refreshTokens: async () => {
					throw new Error("not-used");
				},
				listMessages: async () => {
					throw new Error("not-used");
				},
				getMessage: async () => {
					throw new Error("not-used");
				},
				revoke: async () => {},
			},
		},
		clock: () => new Date("2026-09-13T12:00:00.000Z"),
	};
}

function disconnectLifecycle(calls: Record<string, unknown>[]) {
	return {
		store: {
			claimDisconnect: async (input: unknown) => {
				calls.push({ kind: "disconnect-claim", input });
				return {
					kind: "cleanup-required" as const,
					claim: {
						disconnectId: "disconnect-1",
						connectionId,
						previousConnectionRevision: 4,
						connectionRevision: 5,
						organizationId: 20,
						ownerUserId: actorUserId,
						employeeProfileId: 10,
						officeAuthorityKey: "office-authority-v1:test",
						authorityRevision: "authority-1",
					},
				};
			},
			completeDisconnect: async (input: unknown) => {
				calls.push({ kind: "disconnect-complete", input });
				return { kind: "completed" as const };
			},
			recordProviderRevoked: async () => ({ kind: "claim-lost" as const }),
			recordDisconnectFailure: async () => ({ kind: "recorded" as const }),
		},
		adapters: {},
		keyRing: { resolve: () => Buffer.alloc(32) },
		clock: () => new Date("2026-09-13T12:00:00.000Z"),
	};
}

function dependencies() {
	const calls: Record<string, unknown>[] = [];
	const connection = connectionLifecycle();
	const previewProviderCalls: Record<string, unknown>[] = [];
	return {
		calls,
		previewProviderCalls,
		authorizePreview: async (input: unknown) => {
			calls.push({ kind: "preview-authority", input });
		},
		readConnections: async (input: { actorUserId: number }) => {
			calls.push({ kind: "connections", input });
			return [
				{
					connectionId,
					provider: "gmail" as const,
					accountEmail: "Rep@Example.com",
					displayName: "Sales Rep",
					state: "active" as const,
					healthStatus: "healthy" as const,
					revision: 4,
					lastSyncAt: new Date("2026-09-13T11:00:00.000Z"),
				},
			];
		},
		connectionLifecycle: connection,
		inbox: {
			list: async (input: unknown) => {
				calls.push({ kind: "inbox-list", input });
				return page;
			},
			detail: async (input: unknown) => {
				calls.push({ kind: "inbox-detail", input });
				return detail;
			},
		},
		resolveInboxAuthority: async (input: {
			actorUserId: number;
			connectionId: string;
		}) => {
			calls.push({ kind: "inbox-authority", input });
			return {
				kind: "authorized" as const,
				authority: {
					connectionId: input.connectionId,
					ownerUserId: input.actorUserId,
					organizationId: 20,
					officeAuthorityKey: "office-authority-v1:test",
					connectionRevision: 4,
					authorityRevision: "authority-1",
					policyRevision: 1,
				},
			};
		},
		preview: {
			resolveAuthorizedQueue: async (input: unknown) => {
				calls.push({ kind: "preview-queue", input });
				return {
					kind: "authorized" as const,
					modelInput: prepareMailboxModelInput({ text: "One exterior door" }),
					identity: {
						queueIdentity,
						snapshotIdentity: `mbs1:${"b".repeat(64)}`,
						contentHash: `msc1:${"c".repeat(64)}`,
					},
				};
			},
			createPreviewDependencies: (context: Record<string, unknown>) => ({
				authorize: async () => {},
				reserveUsage: async () => {},
				readSnapshot: async () => snapshot,
				createProvider: () => async (input: Record<string, unknown>) => {
					previewProviderCalls.push(input);
					return { output };
				},
				telemetry: {
					beginRun: async () => {},
					markProviderAttempted: async () => {},
					completeRun: async () => {},
				},
				...context,
			}),
		},
		disconnectLifecycle: disconnectLifecycle(calls),
	};
}

describe("Sales Request mailbox API composition", () => {
	test("lists only the injected actor's connection status projection", async () => {
		const fixture = dependencies();
		const api = createSalesRequestMailboxApi(fixture);

		expect(await api.listConnections({ actorUserId })).toEqual({
			items: [
				{
					connectionId,
					provider: "gmail",
					accountEmail: "rep@example.com",
					displayName: "Sales Rep",
					state: "active",
					healthStatus: "healthy",
					revision: 4,
					lastSyncAt: new Date("2026-09-13T11:00:00.000Z"),
				},
			],
		});
		expect(fixture.calls).toEqual([
			{ kind: "connections", input: { actorUserId } },
		]);
	});

	test("begins connect with a server-owned redirect target", async () => {
		const fixture = dependencies();
		const api = createSalesRequestMailboxApi(fixture);

		const result = await api.beginConnect({ actorUserId, provider: "gmail" });

		expect(result.kind).toBe("authorization-ready");
		expect(fixture.connectionLifecycle.calls.at(-1)).toMatchObject({
			kind: "attempt",
			input: { ownerUserId: actorUserId, redirectKey: "sales-request-inbox" },
		});
	});

	test("forwards owner-scoped Inbox list/detail requests through projections", async () => {
		const fixture = dependencies();
		const api = createSalesRequestMailboxApi(fixture);

		await expect(
			api.listInbox({
				actorUserId,
				connectionId,
				status: "new",
				limit: 10,
			}),
		).resolves.toEqual(page);
		await expect(
			api.getInboxDetail({ actorUserId, connectionId, queueIdentity }),
		).resolves.toEqual(detail);
		expect(fixture.calls).toEqual([
			{
				kind: "inbox-authority",
				input: { actorUserId, connectionId },
			},
			{
				kind: "inbox-list",
				input: {
					actorUserId,
					connectionId,
					authority: {
						connectionId,
						ownerUserId: actorUserId,
						organizationId: 20,
						officeAuthorityKey: "office-authority-v1:test",
						connectionRevision: 4,
						authorityRevision: "authority-1",
						policyRevision: 1,
					},
					request: {
						status: "new",
						limit: 10,
					},
				},
			},
			{
				kind: "inbox-authority",
				input: { actorUserId, connectionId },
			},
			{
				kind: "inbox-detail",
				input: {
					actorUserId,
					connectionId,
					authority: {
						connectionId,
						ownerUserId: actorUserId,
						organizationId: 20,
						officeAuthorityKey: "office-authority-v1:test",
						connectionRevision: 4,
						authorityRevision: "authority-1",
						policyRevision: 1,
					},
					queueIdentity,
				},
			},
		]);
	});

	test("requires preview authorization before queue resolution or provider access", async () => {
		const fixture = dependencies();
		fixture.authorizePreview = async (input: unknown) => {
			fixture.calls.push({ kind: "preview-authority", input });
			throw new AppError({
				code: "PERMISSION_DENIED",
				publicMessage: "Mailbox preview is unavailable.",
				reportable: false,
			});
		};
		const api = createSalesRequestMailboxApi(fixture);

		await expect(
			api.generatePreview({
				actorUserId,
				queueIdentity,
				type: "quote",
				signal,
			}),
		).rejects.toMatchObject({
			code: "PERMISSION_DENIED",
			publicMessage: "Mailbox preview is unavailable.",
		});
		expect(fixture.calls.map((call) => call.kind)).toEqual([
			"preview-authority",
		]);
		expect(fixture.previewProviderCalls).toHaveLength(0);
	});

	test("uses the existing mailbox preview bridge and never returns mailbox internals", async () => {
		const fixture = dependencies();
		const api = createSalesRequestMailboxApi(fixture);

		const result = await api.generatePreview({
			actorUserId,
			queueIdentity,
			type: "quote",
			signal,
		});

		expect(result.seed).toEqual(output);
		expect(fixture.previewProviderCalls[0]).toMatchObject({
			text: prepareMailboxModelInput({ text: "One exterior door" }),
			images: [],
			signal,
		});
		expect(result).not.toHaveProperty("modelInput");
	});

	test("maps unavailable Inbox data to an opaque typed not-found error", async () => {
		const fixture = dependencies();
		fixture.inbox.detail = async () => {
			throw new Error("mailbox-inbox-item-unavailable");
		};
		const api = createSalesRequestMailboxApi(fixture);

		await expect(
			api.getInboxDetail({ actorUserId, connectionId, queueIdentity }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			publicMessage: "The mailbox request is unavailable.",
		});
	});

	test("does not accept a caller-supplied organization and passes server authority to Inbox", async () => {
		const fixture = dependencies();
		const api = createSalesRequestMailboxApi(fixture);

		await expect(
			api.listInbox({
				actorUserId,
				connectionId,
				organizationId: 999,
			} as never),
		).rejects.toThrow();
		await api.listInbox({ actorUserId, connectionId, limit: 10 });
		expect(fixture.calls).toContainEqual({
			kind: "inbox-authority",
			input: { actorUserId, connectionId },
		});
	});

	test("rejects a detail adapter response for a different queue", async () => {
		const fixture = dependencies();
		fixture.inbox.detail = async () => ({
			...detail,
			queueIdentity: `srq1:${"d".repeat(64)}`,
		});
		const api = createSalesRequestMailboxApi(fixture);

		await expect(
			api.getInboxDetail({ actorUserId, connectionId, queueIdentity }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			publicMessage: "The mailbox request is unavailable.",
		});
	});

	test("maps stale or unauthorized preview sources without exposing ownership", async () => {
		const fixture = dependencies();
		fixture.preview.resolveAuthorizedQueue = async () => ({
			kind: "forbidden" as const,
		});
		const api = createSalesRequestMailboxApi(fixture);

		await expect(
			api.generatePreview({
				actorUserId,
				queueIdentity,
				type: "quote",
				signal,
			}),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			publicMessage: "The mailbox request is unavailable.",
		});
	});

	test("projects erased account identity as null for disconnected connections", async () => {
		const fixture = dependencies();
		fixture.readConnections = async () => [
			{
				connectionId,
				provider: "gmail" as const,
				accountEmail: null,
				displayName: null,
				state: "disconnected" as const,
				healthStatus: "unknown" as const,
				revision: 5,
				lastSyncAt: null,
			},
		];
		const api = createSalesRequestMailboxApi(fixture);

		await expect(api.listConnections({ actorUserId })).resolves.toMatchObject({
			items: [
				{
					connectionId,
					state: "disconnected",
					accountEmail: null,
				},
			],
		});
	});

	test("rejects a non-HTTPS authorization URL before returning it", async () => {
		const fixture = dependencies();
		fixture.connectionLifecycle.adapters.gmail.createAuthorizationUrl =
			async () => "http://mail.example/connect";
		const api = createSalesRequestMailboxApi(fixture);

		await expect(
			api.beginConnect({ actorUserId, provider: "gmail" }),
		).rejects.toMatchObject({
			code: "PROVIDER_UNAVAILABLE",
		});
	});

	test("disconnects only through the actor-owned revisioned lifecycle", async () => {
		const fixture = dependencies();
		const disconnectCalls: Record<string, unknown>[] = [];
		const api = createSalesRequestMailboxApi({
			...fixture,
			disconnectLifecycle: disconnectLifecycle(disconnectCalls),
		});

		expect(
			await api.disconnect({
				actorUserId,
				connectionId,
				expectedConnectionRevision: 4,
				signal,
			}),
		).toEqual({ kind: "disconnected" });
		expect(disconnectCalls[0]).toMatchObject({
			kind: "disconnect-claim",
			input: { actorUserId, connectionId, expectedConnectionRevision: 4 },
		});
	});

	test("router exposes protected procedures without accepting an injected actor", async () => {
		const fixture = dependencies();
		const router = createSalesRequestMailboxRouter({
			...fixture,
			disconnectLifecycle: disconnectLifecycle([]),
		});
		const caller = router.createCaller({
			db: {},
			userId: actorUserId,
		} as never);
		expect(await caller.connections()).toEqual({
			items: [expect.objectContaining({ connectionId, provider: "gmail" })],
		});
		await expect(
			caller.listInbox({ connectionId, actorUserId: 999 } as never),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		await expect(
			caller.beginConnect({
				provider: "gmail",
				redirectKey: "sales-settings-mailbox",
			} as never),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		await expect(
			router.createCaller({ db: {} } as never).connections(),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});
});
