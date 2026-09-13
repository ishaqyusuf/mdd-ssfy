import { describe, expect, mock, test } from "bun:test";
import {
	ASSISTANT_FEATURE_ANALYSIS_VERSION,
	ASSISTANT_FEATURE_KNOWLEDGE_MAX_BYTES,
	assistantFeatureKnowledgeSnapshot,
	classifyAssistantCapabilityOutcome,
	deliverNextAssistantFeatureNotification,
	listMyAssistantFeatureRequests,
	prepareAssistantFeatureRequest,
	processNextAssistantFeatureAnalysis,
	publishAssistantCapabilityRelease,
	submitAssistantFeatureRequest,
	triageAssistantFeatureRequest,
	unsubscribeAssistantFeatureRequest,
} from "./feature-requests";

const actor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	timezone: "UTC",
	grants: {},
};

const transactional = <T extends object>(store: T) =>
	Object.assign(store, {
		$transaction: async <R>(callback: (tx: T) => Promise<R>) => callback(store),
	});

const validAnalysis = {
	version: ASSISTANT_FEATURE_ANALYSIS_VERSION,
	normalizedNeed: "Generate short training videos from approved scripts.",
	existingAlternatives: [],
	affectedDomains: ["other"],
	requiredInputs: ["Approved script"],
	requiredOutputs: ["Video artifact"],
	permissionChanges: ["Add explicit media-generation access"],
	dataChanges: [],
	queryAndIndexPlan: [],
	dependencies: ["Reviewed media provider"],
	migrationImpact: "No business schema mutation is required.",
	uiSurfaces: ["Assistant artifact canvas"],
	acceptanceCases: ["An authorized user receives a reviewable video draft."],
	risks: ["Provider cost and unsafe prompt content"],
	openQuestions: ["Which formats are supported?"],
	size: "large",
	confidence: 0.7,
	citations: [
		{
			id: "assistant-schema",
			label: "Schema",
			version: "assistant-schema-2026-09-13",
		},
	],
} as const;

describe("Assistant feature request lifecycle", () => {
	test("keeps missing features distinct from denial, prerequisites, outages, degraded rollout, and ambiguity", () => {
		expect(
			classifyAssistantCapabilityOutcome({ hasRegistryMatch: false }),
		).toBe("missing_capability");
		expect(classifyAssistantCapabilityOutcome({ authorized: false })).toBe(
			"access_denied",
		);
		expect(classifyAssistantCapabilityOutcome({ capability: "disabled" })).toBe(
			"unmet_prerequisite",
		);
		expect(
			classifyAssistantCapabilityOutcome({ resultStatus: "unavailable" }),
		).toBe("outage");
		expect(classifyAssistantCapabilityOutcome({ capability: "degraded" })).toBe(
			"degraded_rollout",
		);
		expect(classifyAssistantCapabilityOutcome({ ambiguous: true })).toBe(
			"ambiguity",
		);
	});

	test("offers intake only for a genuine missing capability", () => {
		const missing = prepareAssistantFeatureRequest(
			actor,
			"Compose animated training videos from spoken scripts",
		);
		expect(missing).toMatchObject({
			classification: "missing_capability",
			category: "other",
		});
		expect(
			prepareAssistantFeatureRequest(
				actor,
				"Request a feature to compose animated training videos",
			).classification,
		).toBe("missing_capability");

		const implemented = prepareAssistantFeatureRequest(
			actor,
			"Search assistant tools for sales capabilities",
		);
		expect(implemented.classification).toBe("available");
		expect(implemented.alternative?.toolId).toBe("system_search_tools");
	});

	test("captures versioned tool schemas and concrete cross-domain repository knowledge", () => {
		const snapshot = assistantFeatureKnowledgeSnapshot("sales");
		const salesTool = snapshot.registry.find(
			(tool) => tool.toolId === "sales_find_orders",
		);
		expect(salesTool?.inputContract).toBeDefined();
		expect(salesTool?.outputContract).toBeDefined();
		expect(snapshot.dataModel.entities).toContainEqual(
			expect.objectContaining({ name: "SalesOrders" }),
		);
		expect(snapshot.engineeringContract.repositories.length).toBeGreaterThan(2);
		expect(snapshot.schemaVersion).toMatch(/^assistant-schema-[a-f0-9]{16}$/);
		expect(
			Buffer.byteLength(JSON.stringify(snapshot), "utf8"),
		).toBeLessThanOrEqual(ASSISTANT_FEATURE_KNOWLEDGE_MAX_BYTES);
		expect(JSON.stringify(snapshot)).toContain("viewOrders/editOrders");
		expect(JSON.stringify(snapshot)).not.toContain("createOrder");
	});

	test("persists request, evidence, immutable event, analysis job, and developer outbox atomically without an unchecked subscription", async () => {
		const subscription = mock(async () => ({ id: "subscription" }));
		const store = transactional({
			assistantFeatureRequestSubmission: {
				findFirst: mock(async () => null),
				create: mock(async () => ({ id: "submission-1" })),
			},
			assistantConversation: {
				findFirst: mock(async () => ({ id: "conversation-1" })),
			},
			assistantFeatureRequest: {
				upsert: mock(async (input) => ({
					id: "request-1",
					occurrenceCount: 1,
					lastEventSequence: 1,
					status: "submitted",
					...input.data,
				})),
			},
			assistantFeatureSubscription: { upsert: subscription },
			assistantFeatureRequestEvent: {
				create: mock(async () => ({ id: "event-1" })),
			},
			assistantFeatureAnalysisJob: {
				upsert: mock(async () => ({ id: "analysis-1" })),
			},
			assistantFeatureNotificationOutbox: {
				upsert: mock(async () => ({ id: "outbox-1" })),
			},
		});
		const result = await submitAssistantFeatureRequest(store as never, actor, {
			clientRequestId: "75e55a33-9bed-4d5d-9cf7-52d2fc9fbe71",
			summary: "Compose animated training videos from spoken scripts",
			releaseOptIn: false,
			evidence: { source: "assistant_menu", conversationId: "conversation-1" },
		});
		expect(result).toMatchObject({
			status: "saved",
			deduplicated: false,
			notificationStatus: "pending",
		});
		expect(subscription).not.toHaveBeenCalled();
		expect(
			store.assistantFeatureRequestSubmission.create.mock.calls[0]?.[0],
		).toMatchObject({
			data: {
				releaseOptIn: false,
				evidence: {
					source: "assistant_menu",
					conversationId: "conversation-1",
				},
			},
		});
		expect(
			store.assistantFeatureRequestEvent.create.mock.calls[0]?.[0],
		).toMatchObject({ data: { type: "request_submitted", sequence: 1 } });
	});

	test("returns the original durable receipt for a double click", async () => {
		const request = { id: "request-1", status: "submitted" };
		const create = mock(async () => ({ id: "unexpected" }));
		const store = transactional({
			assistantFeatureRequestSubmission: {
				findFirst: mock(async () => ({ id: "submission-1", request })),
				create,
			},
		});
		const result = await submitAssistantFeatureRequest(store as never, actor, {
			clientRequestId: "75e55a33-9bed-4d5d-9cf7-52d2fc9fbe71",
			summary: "Compose animated training videos from spoken scripts",
			releaseOptIn: true,
			evidence: { source: "assistant_menu" },
		});
		expect(result).toMatchObject({
			status: "saved",
			request,
			deduplicated: true,
		});
		expect(create).not.toHaveBeenCalled();
	});

	test("rejects evidence outside the actor scope and scopes idempotency lookup", async () => {
		const submissionLookup = mock(async () => null);
		const store = transactional({
			assistantFeatureRequestSubmission: { findFirst: submissionLookup },
			assistantConversation: { findFirst: mock(async () => null) },
		});
		await expect(
			submitAssistantFeatureRequest(store as never, actor, {
				clientRequestId: "75e55a33-9bed-4d5d-9cf7-52d2fc9fbe71",
				summary: "Compose animated training videos from spoken scripts",
				releaseOptIn: false,
				evidence: {
					source: "assistant_menu",
					conversationId: "another-scope-conversation",
				},
			}),
		).rejects.toThrow("outside the current scope");
		expect(submissionLookup.mock.calls[0]?.[0]).toMatchObject({
			where: {
				reporterUserId: 42,
				scopeType: "organization",
				scopeId: "7",
			},
		});
	});

	test("returns a caller-owned request summary without shared internal fields", async () => {
		const findMany = mock(async () => [
			{
				id: "request-1",
				status: "triaged",
				category: "other",
				capabilityKey: null,
				analysisStatus: "completed",
				updatedAt: new Date(),
				release: null,
				submissions: [{ summary: "My own requested outcome" }],
				subscriptions: [],
			},
		]);
		const result = await listMyAssistantFeatureRequests(
			{ assistantFeatureRequest: { findMany } } as never,
			actor,
		);
		expect(result[0]).toMatchObject({
			id: "request-1",
			summary: "My own requested outcome",
		});
		expect(result[0]).not.toHaveProperty("analysis");
		expect(result[0]).not.toHaveProperty("ownerUserId");
		expect(findMany.mock.calls[0]?.[0]).toMatchObject({
			select: {
				submissions: {
					where: {
						reporterUserId: 42,
						scopeType: "organization",
						scopeId: "7",
					},
				},
			},
		});
	});

	test("retries bounded analysis without losing the request", async () => {
		const jobUpdate = mock(async () => ({ count: 1 }));
		const requestUpdate = mock(async () => ({ count: 1 }));
		const store = transactional({
			assistantFeatureAnalysisJob: {
				findFirst: mock(async () => ({
					id: "job-1",
					requestId: "request-1",
					status: "queued",
					attempts: 0,
					maxAttempts: 3,
					request: {
						summary: "Compose animated training videos from spoken scripts",
						category: "other",
						knowledgeSnapshot: {
							citations: [
								{
									id: "assistant-schema",
									version: "assistant-schema-2026-09-13",
								},
							],
						},
					},
				})),
				updateMany: jobUpdate,
			},
			assistantFeatureRequest: { updateMany: requestUpdate },
		});
		const result = await processNextAssistantFeatureAnalysis(
			store as never,
			async () => {
				throw new Error("provider details must stay private");
			},
		);
		expect(result).toEqual({ status: "retrying", requestId: "request-1" });
		expect(jobUpdate.mock.calls.at(-1)?.[0]).toMatchObject({
			data: { status: "retrying", lastErrorCode: "ANALYSIS_FAILED" },
		});
		expect(JSON.stringify(jobUpdate.mock.calls)).not.toContain(
			"provider details",
		);
		expect(requestUpdate.mock.calls.at(-1)?.[0]).toMatchObject({
			data: { analysisStatus: "retrying", status: "submitted" },
		});
	});

	test("accepts only a bounded cited analysis envelope", async () => {
		const eventCreate = mock(async () => ({ id: "event-1" }));
		const jobUpdate = mock(async () => ({ count: 1 }));
		const store = transactional({
			assistantFeatureAnalysisJob: {
				findFirst: mock(async () => ({
					id: "job-1",
					requestId: "request-1",
					status: "queued",
					attempts: 0,
					maxAttempts: 3,
					request: {
						summary: "Video",
						category: "other",
						knowledgeSnapshot: {
							citations: [
								{
									id: "assistant-schema",
									version: "assistant-schema-2026-09-13",
								},
							],
						},
					},
				})),
				updateMany: jobUpdate,
				update: mock(async () => ({ id: "job-1" })),
			},
			assistantFeatureRequest: {
				updateMany: mock(async () => ({ count: 1 })),
				update: mock(async () => ({ lastEventSequence: 2 })),
			},
			assistantFeatureRequestEvent: { create: eventCreate },
		});
		const now = new Date("2026-09-13T12:00:00.789Z");
		const result = await processNextAssistantFeatureAnalysis(
			store as never,
			async ({ limits }) => {
				expect(limits).toEqual({ maxOutputTokens: 3_000, timeoutMs: 45_000 });
				return validAnalysis;
			},
			now,
		);
		expect(result).toEqual({ status: "completed", requestId: "request-1" });
		expect(eventCreate).toHaveBeenCalledTimes(1);
		const normalizedLease = new Date("2026-09-13T12:00:00.000Z");
		expect(jobUpdate.mock.calls[0]?.[0]).toMatchObject({
			data: { claimedAt: normalizedLease },
		});
		expect(jobUpdate.mock.calls[1]?.[0]).toMatchObject({
			where: { claimedAt: normalizedLease },
		});
	});

	test("uses a unique tombstone for every subscribe and unsubscribe cycle", async () => {
		let cycle = 0;
		const subscriptionUpdate = mock(async (input) => input.data);
		const store = transactional({
			assistantFeatureRequest: {
				findFirst: mock(async () => ({ id: "request-1" })),
				update: mock(async () => ({ lastEventSequence: ++cycle })),
			},
			assistantFeatureSubscription: {
				findMany: mock(async () => [{ id: `subscription-${cycle + 1}` }]),
				update: subscriptionUpdate,
			},
			assistantFeatureRequestEvent: { create: mock(async () => ({})) },
		});
		await unsubscribeAssistantFeatureRequest(
			store as never,
			actor,
			"request-1",
		);
		await unsubscribeAssistantFeatureRequest(
			store as never,
			actor,
			"request-1",
		);
		expect(
			subscriptionUpdate.mock.calls.map(([input]) => input.data.activeKey),
		).toEqual(["unsubscribed:subscription-1", "unsubscribed:subscription-2"]);
	});

	test("retries analysis that invents a citation outside the curated snapshot", async () => {
		const jobUpdate = mock(async () => ({ count: 1 }));
		const store = transactional({
			assistantFeatureAnalysisJob: {
				findFirst: mock(async () => ({
					id: "job-1",
					requestId: "request-1",
					status: "queued",
					attempts: 0,
					maxAttempts: 3,
					claimedAt: null,
					request: {
						summary: "Video",
						category: "other",
						knowledgeSnapshot: {
							citations: [
								{
									id: "assistant-schema",
									version: "assistant-schema-2026-09-13",
								},
							],
						},
					},
				})),
				updateMany: jobUpdate,
			},
			assistantFeatureRequest: {
				updateMany: mock(async () => ({ count: 1 })),
			},
		});
		const result = await processNextAssistantFeatureAnalysis(
			store as never,
			async () => ({
				...validAnalysis,
				citations: [{ id: "invented", label: "Invented", version: "future" }],
			}),
		);
		expect(result).toEqual({ status: "retrying", requestId: "request-1" });
		expect(jobUpdate.mock.calls.at(-1)?.[0]).toMatchObject({
			data: { status: "retrying", lastErrorCode: "ANALYSIS_FAILED" },
		});
	});

	test("does not finalize after another worker reclaims the analysis lease", async () => {
		const eventCreate = mock(async () => ({ id: "event-1" }));
		const updateMany = mock()
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 0 });
		const store = transactional({
			assistantFeatureAnalysisJob: {
				findFirst: mock(async () => ({
					id: "job-1",
					requestId: "request-1",
					status: "queued",
					attempts: 0,
					maxAttempts: 3,
					claimedAt: null,
					request: {
						summary: "Video",
						category: "other",
						knowledgeSnapshot: {
							citations: [
								{
									id: "assistant-schema",
									version: "assistant-schema-2026-09-13",
								},
							],
						},
					},
				})),
				updateMany,
			},
			assistantFeatureRequest: {
				updateMany: mock(async () => ({ count: 1 })),
				update: mock(async () => ({ lastEventSequence: 2 })),
			},
			assistantFeatureRequestEvent: { create: eventCreate },
		});
		expect(
			await processNextAssistantFeatureAnalysis(store as never, async () =>
				structuredClone(validAnalysis),
			),
		).toEqual({ status: "contended" });
		expect(eventCreate).not.toHaveBeenCalled();
	});

	test("publishes only verified rollout evidence and deduplicates one notice per release subscription", async () => {
		const outbox = mock(async () => ({ id: "outbox-1" }));
		const store = transactional({
			assistantFeatureRequest: {
				findMany: mock()
					.mockResolvedValueOnce([{ id: "request-1", status: "testing" }])
					.mockResolvedValueOnce([{ id: "request-duplicate" }]),
				updateMany: mock(async () => ({ count: 1 })),
			},
			assistantCapabilityRelease: {
				upsert: mock(async () => ({ id: "release-1" })),
			},
			assistantFeatureSubscription: {
				findMany: mock(async () => [
					{ id: "subscription-1", requestId: "request-duplicate" },
				]),
			},
			assistantFeatureNotificationOutbox: { upsert: outbox },
		});
		const result = await publishAssistantCapabilityRelease(
			store as never,
			9,
			{
				capabilityKey: "sales_find_orders",
				version: "1",
				rolloutEvidence: {
					verificationId: "acceptance-run-9",
					verifiedAt: "2026-09-13T12:00:00.000Z",
					notes: "Production rollout and access checks passed.",
				},
				requestIds: ["request-1"],
			},
			new Date("2026-09-13T13:00:00.000Z"),
		);
		expect(result.queuedNotices).toBe(1);
		expect(
			store.assistantCapabilityRelease.upsert.mock.calls[0]?.[0],
		).toMatchObject({
			create: {
				title: "Find sales orders",
				requiredGrants: { allOf: ["viewOrders"], anyOf: [] },
			},
		});
		expect(outbox.mock.calls[0]?.[0]).toMatchObject({
			create: {
				kind: "release_available",
				requestId: "request-duplicate",
				subscriptionId: "subscription-1",
			},
		});
	});

	test("rejects future verification and requests that were not accepted", async () => {
		const input = {
			capabilityKey: "sales_find_orders",
			version: "1",
			rolloutEvidence: {
				verificationId: "acceptance-run-9",
				verifiedAt: "2026-09-13T14:00:00.000Z",
				notes: "Rollout checks passed.",
			},
			requestIds: ["request-1"],
		};
		await expect(
			publishAssistantCapabilityRelease(
				{} as never,
				9,
				input,
				new Date("2026-09-13T13:00:00.000Z"),
			),
		).rejects.toThrow("cannot be in the future");

		const store = transactional({
			assistantFeatureRequest: {
				findMany: mock(async () => [{ id: "request-1", status: "submitted" }]),
			},
		});
		await expect(
			publishAssistantCapabilityRelease(
				store as never,
				9,
				{
					...input,
					rolloutEvidence: {
						...input.rolloutEvidence,
						verifiedAt: "2026-09-13T12:00:00.000Z",
					},
				},
				new Date("2026-09-13T13:00:00.000Z"),
			),
		).rejects.toThrow("must be accepted");
	});

	test("validates an active owner and records merge and analysis-review triage", async () => {
		const updatedAt = new Date("2026-09-13T12:00:00.000Z");
		const eventCreate = mock(async () => ({ id: "event-1" }));
		const store = transactional({
			users: { findFirst: mock(async () => ({ id: 77 })) },
			assistantFeatureRequest: {
				findUnique: mock(async () => ({
					id: "request-duplicate",
					scopeType: "organization",
					scopeId: "7",
					analysisStatus: "completed",
					analysis: validAnalysis,
					updatedAt,
				})),
				findFirst: mock(async () => ({ id: "request-canonical" })),
				update: mock(async (input) => ({
					id: "request-duplicate",
					status: "duplicate",
					assignedToUserId: input.data.assignedToUserId,
					mergedIntoId: input.data.mergedIntoId,
					lastEventSequence: 4,
				})),
			},
			assistantFeatureRequestEvent: { create: eventCreate },
		});
		await triageAssistantFeatureRequest(store as never, 9, {
			requestId: "request-duplicate",
			assignedToUserId: 77,
			mergedIntoId: "request-canonical",
			reviewAnalysis: true,
			expectedUpdatedAt: updatedAt,
		});
		expect(store.users.findFirst.mock.calls[0]?.[0]).toMatchObject({
			where: { id: 77, deletedAt: null, accessRevokedAt: null },
		});
		expect(eventCreate.mock.calls[0]?.[0]).toMatchObject({
			data: {
				type: "request_merged",
				payload: {
					assignedToUserId: 77,
					mergedIntoId: "request-canonical",
					reviewAnalysis: true,
				},
			},
		});
	});

	test("cancels release delivery after consent or access is revoked", async () => {
		const notify = mock(async () => undefined);
		const updateMany = mock(async () => ({ count: 1 }));
		const store = {
			assistantFeatureNotificationOutbox: {
				findFirst: mock(async () => ({
					id: "outbox-1",
					status: "pending",
					attempts: 0,
					kind: "release_available",
					request: { id: "request-1" },
					subscription: {
						id: "subscription-1",
						userId: 42,
						activeKey: "request-1",
						unsubscribedAt: new Date(),
					},
					release: {
						status: "available",
						verifiedAt: new Date(),
						publishedAt: new Date(),
						requiredGrants: [],
					},
				})),
				updateMany,
			},
		};
		const result = await deliverNextAssistantFeatureNotification(
			store as never,
			{
				notifyDevelopers: async () => undefined,
				notifySubscriber: notify,
				canAccess: async () => true,
			},
		);
		expect(result.status).toBe("cancelled");
		expect(notify).not.toHaveBeenCalled();
		expect(updateMany.mock.calls.at(-1)?.[0]).toMatchObject({
			where: { status: "delivering", attempts: 1 },
			data: { status: "cancelled", lastErrorCode: "CONSENT_OR_ACCESS_REVOKED" },
		});
	});

	test("fails closed when a stored release grant policy is malformed", async () => {
		const notify = mock(async () => undefined);
		const canAccess = mock(async () => true);
		const update = mock(async (input) => input.data);
		const store = {
			assistantFeatureNotificationOutbox: {
				findFirst: mock(async () => ({
					id: "outbox-1",
					status: "pending",
					attempts: 0,
					kind: "release_available",
					request: { id: "request-1" },
					subscription: {
						id: "subscription-1",
						userId: 42,
						scopeType: "organization",
						scopeId: "7",
						activeKey: "active",
						unsubscribedAt: null,
					},
					release: {
						status: "available",
						verifiedAt: new Date(),
						publishedAt: new Date(),
						requiredGrants: ["viewOrders", 42],
					},
				})),
				updateMany: mock(async () => ({ count: 1 })),
				update,
			},
		};
		const result = await deliverNextAssistantFeatureNotification(
			store as never,
			{
				notifyDevelopers: async () => undefined,
				notifySubscriber: notify,
				canAccess,
			},
		);
		expect(result.status).toBe("cancelled");
		expect(canAccess).not.toHaveBeenCalled();
		expect(notify).not.toHaveBeenCalled();
	});

	test("keeps a delivery outage retryable without claiming notification success", async () => {
		const updateMany = mock(async () => ({ count: 1 }));
		const store = {
			assistantFeatureNotificationOutbox: {
				findFirst: mock(async () => ({
					id: "outbox-1",
					status: "pending",
					attempts: 0,
					kind: "developer_intake",
					request: { id: "request-1", summary: "Requested feature" },
					subscription: null,
					release: null,
				})),
				updateMany,
			},
		};
		const result = await deliverNextAssistantFeatureNotification(
			store as never,
			{
				notifyDevelopers: async () => {
					throw new Error("provider outage");
				},
				notifySubscriber: async () => undefined,
				canAccess: async () => true,
			},
			new Date("2026-09-13T12:00:00.000Z"),
		);
		expect(result.status).toBe("retrying");
		expect(updateMany.mock.calls.at(-1)?.[0]).toMatchObject({
			where: { status: "delivering", attempts: 1 },
			data: { status: "retrying", lastErrorCode: "DELIVERY_FAILED" },
		});
		expect(JSON.stringify(updateMany.mock.calls)).not.toContain(
			"provider outage",
		);
	});

	test("does not let a stale notification worker overwrite a reclaimed lease", async () => {
		const updateMany = mock()
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 0 });
		const store = {
			assistantFeatureNotificationOutbox: {
				findFirst: mock(async () => ({
					id: "outbox-1",
					status: "pending",
					attempts: 2,
					availableAt: new Date("2026-09-13T11:00:00.000Z"),
					kind: "developer_intake",
					request: {
						id: "request-1",
						summary: "Requested feature",
						ownerUserId: 42,
					},
					subscription: null,
					release: null,
				})),
				updateMany,
			},
		};
		const result = await deliverNextAssistantFeatureNotification(
			store as never,
			{
				notifyDevelopers: async () => undefined,
				notifySubscriber: async () => undefined,
				canAccess: async () => true,
			},
		);
		expect(result).toEqual({ status: "contended" });
		expect(updateMany.mock.calls[1]?.[0]).toMatchObject({
			where: { id: "outbox-1", status: "delivering", attempts: 3 },
			data: { status: "delivered" },
		});
	});
});
