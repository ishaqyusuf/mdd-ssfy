import { describe, expect, mock, test } from "bun:test";
import { NEW_SALES_FORM_SEED_EXAMPLE } from "@gnd/sales/sales-form-core";

import {
	assistantSavedActionCreateSchema,
	buildAssistantSavedActionResultParts,
	classifyAssistantSavedActionResultStatus,
	createAssistantSavedAction,
	executeAssistantSavedAction,
	getAssistantSaveActionEligibility,
	isReusableAssistantToolExecutionResult,
	listAssistantSavedActions,
	removeAssistantSavedAction,
	reorderAssistantSavedActions,
	resolveAssistantRecipeInput,
	saveAssistantActionFromRun,
	updateAssistantPreferences,
} from "./saved-actions";

const actor = {
	userId: 42,
	scopeType: "organization",
	scopeId: "7",
	timezone: "America/New_York",
	grants: {},
};

const currentRevision = (toolId: string, version = 1) =>
	`assistant-catalog-v8:${toolId}@${version}`;

function transactional<T extends object>(store: T) {
	return Object.assign(store, {
		$transaction: async <R>(callback: (tx: T) => Promise<R> | R) =>
			callback(store),
	});
}

describe("assistant saved actions and preferences", () => {
	test("resolves relative dates in the actor timezone at run time", () => {
		expect(
			resolveAssistantRecipeInput({
				template: {
					from: { $parameter: "from" },
					to: { $parameter: "to" },
				},
				definitions: [
					{
						key: "from",
						label: "From",
						type: "relative_date",
						required: true,
					},
					{
						key: "to",
						label: "To",
						type: "relative_date",
						required: true,
					},
				],
				parameters: { from: "days_ago:30", to: "today" },
				timezone: "America/New_York",
				now: new Date("2026-09-13T02:00:00.000Z"),
			}),
		).toEqual({ from: "2026-08-13", to: "2026-09-12" });
	});

	test("scopes favorites to the current user and flags tampered recipes", async () => {
		let query: unknown;
		const db = {
			assistantSavedAction: {
				findMany: mock(async (input) => {
					query = input;
					return [
						{
							id: "action-1",
							toolId: "system_search_tools",
							toolVersion: 1,
							effect: "write",
							compatibilityRevision: currentRevision("system_search_tools"),
						},
					];
				}),
			},
		};
		const rows = await listAssistantSavedActions(db as never, actor);
		expect(query).toMatchObject({
			where: {
				ownerUserId: 42,
				scopeType: "organization",
				scopeId: "7",
				deletedAt: null,
			},
		});
		expect(rows[0]?.compatibility.status).toBe("unavailable");
	});

	test("runs a prompt shortcut and records its last-run status", async () => {
		const updateMany = mock(async () => ({ count: 1 }));
		const result = await executeAssistantSavedAction(
			{
				assistantSavedAction: {
					findFirst: mock(async () => ({
						id: "action-1",
						kind: "prompt_shortcut",
						promptTemplate: "Find order 123",
					})),
					updateMany,
				},
			} as never,
			actor,
			{ id: "action-1", parameters: {} },
			new Date("2026-09-13T12:00:00.000Z"),
		);
		expect(result).toEqual({
			status: "prompt_ready",
			prompt: "Find order 123",
		});
		expect(updateMany.mock.calls[0]?.[0]).toMatchObject({
			where: { id: "action-1", ownerUserId: 42 },
			data: { lastRunStatus: "ready" },
		});
	});

	test("persists a deterministic read result in the scoped conversation", async () => {
		let messageData: unknown;
		const db = transactional({
			assistantSavedAction: {
				findFirst: mock(async () => ({
					id: "action-read",
					kind: "recipe",
					toolId: "system_search_tools",
					toolVersion: 1,
					effect: "read",
					compatibilityRevision: currentRevision("system_search_tools"),
					inputTemplate: { query: "sales" },
					parameterDefinitions: [],
					outputBindings: [{ name: "status", path: "status" }],
				})),
				updateMany: mock(async () => ({ count: 1 })),
			},
			assistantConversation: {
				updateMany: mock(async () => ({ count: 1 })),
				findUniqueOrThrow: mock(async () => ({ lastSequence: 4 })),
			},
			assistantRun: { create: mock(async () => ({ id: "run" })) },
			assistantToolExecution: {
				create: mock(async () => ({ id: "execution" })),
			},
			assistantMessage: {
				create: mock(async (input) => {
					messageData = input.data;
					return { id: "message-1" };
				}),
			},
		});
		const result = await executeAssistantSavedAction(db as never, actor, {
			id: "action-read",
			parameters: {},
			conversationId: "conversation-1",
		});
		expect(result).toMatchObject({
			status: "completed",
			resultStatus: "success",
			messageId: "message-1",
		});
		expect(messageData).toMatchObject({
			conversationId: "conversation-1",
			sequence: 4,
			role: "assistant",
		});
	});

	test("does not suggest saving a text-only successful run", async () => {
		let query: unknown;
		const result = await getAssistantSaveActionEligibility(
			{
				assistantToolExecution: {
					findMany: mock(async (input) => {
						query = input;
						return [];
					}),
				},
			} as never,
			actor,
			"run-text-only",
		);
		expect(result).toEqual({ eligible: false });
		expect(query).toMatchObject({
			where: { runId: "run-text-only", status: "succeeded" },
		});
	});

	test("does not offer or save an unresolved requires-input execution", async () => {
		const execution = {
			id: "execution-1",
			result: { status: "requires_input" },
			toolId: "sales_draft_from_request",
			toolVersion: 1,
			run: { triggerMessage: { parts: [] } },
		};
		const db = {
			assistantToolExecution: { findMany: mock(async () => [execution]) },
		};
		expect(
			await getAssistantSaveActionEligibility(
				db as never,
				actor,
				"run-requires-input",
			),
		).toEqual({ eligible: false });
		await expect(
			saveAssistantActionFromRun(db as never, actor, {
				runId: "run-requires-input",
				name: "Unresolved draft",
				kind: "prompt_shortcut",
			}),
		).rejects.toThrow("durable successful action is required");
		expect(isReusableAssistantToolExecutionResult(execution.result)).toBe(
			false,
		);
	});

	test("version-checks every favorite during reorder", async () => {
		const updateMany = mock(async () => ({ count: 1 }));
		const db = transactional({
			assistantSavedAction: {
				findMany: mock(async () => [{ id: "a" }, { id: "b" }]),
				updateMany,
			},
		});
		await reorderAssistantSavedActions(db as never, actor, [
			{ id: "b", expectedVersion: 3 },
			{ id: "a", expectedVersion: 2 },
		]);
		expect(updateMany.mock.calls[0]?.[0]).toMatchObject({
			where: { id: "b", version: 3, ownerUserId: 42 },
			data: { displayOrder: 0, version: { increment: 1 } },
		});
	});

	test("rechecks revoked grants before a deterministic recipe runs", async () => {
		const action = {
			id: "action-2",
			kind: "recipe",
			toolId: "sales_find_orders",
			toolVersion: 1,
			effect: "read",
			compatibilityRevision: currentRevision("sales_find_orders"),
			inputTemplate: { query: "123", limit: 5, includeArchived: false },
			parameterDefinitions: [],
			outputBindings: [],
		};
		await expect(
			executeAssistantSavedAction(
				{
					assistantSavedAction: {
						findFirst: mock(async () => action),
						updateMany: mock(async () => ({ count: 1 })),
					},
				} as never,
				actor,
				{
					id: action.id,
					parameters: {},
					conversationId: "conversation-1",
				},
			),
		).rejects.toThrow("Assistant tool is not available");
	});

	test("creates a shortcut only from a durable successful scoped execution", async () => {
		let executionQuery: unknown;
		const create = mock(async (input) => ({ id: "saved-1", ...input.data }));
		const db = transactional({
			assistantToolExecution: {
				findMany: mock(async (input) => {
					executionQuery = input;
					return [
						{
							result: { status: "success" },
							toolId: "system_search_tools",
							toolVersion: 1,
							run: {
								triggerMessage: {
									parts: [
										{ type: "text", text: "Show today’s blocked orders" },
									],
								},
							},
						},
					];
				}),
			},
			assistantSavedAction: {
				count: mock(async () => 0),
				aggregate: mock(async () => ({ _max: { displayOrder: 1 } })),
				create,
			},
		});
		const saved = await saveAssistantActionFromRun(db as never, actor, {
			runId: "run-1",
			name: "Blocked orders",
			kind: "prompt_shortcut",
		});
		expect(executionQuery).toMatchObject({
			where: {
				runId: "run-1",
				status: "succeeded",
				run: {
					actorUserId: 42,
					conversation: { ownerUserId: 42, scopeId: "7" },
				},
			},
		});
		expect(saved).toMatchObject({
			kind: "prompt_shortcut",
			promptTemplate: "Show today’s blocked orders",
		});
	});

	test("derives a deterministic recipe identity from a durable execution", async () => {
		const create = mock(async (input) => ({ id: "saved-2", ...input.data }));
		const db = transactional({
			assistantToolExecution: {
				findMany: mock(async () => [
					{
						result: { status: "partial" },
						toolId: "system_search_tools",
						toolVersion: 1,
						run: { triggerMessage: { parts: [] } },
					},
				]),
			},
			assistantSavedAction: {
				count: mock(async () => 0),
				aggregate: mock(async () => ({ _max: { displayOrder: null } })),
				create,
			},
		});
		const saved = await saveAssistantActionFromRun(db as never, actor, {
			runId: "run-2",
			name: "Search tools",
			kind: "recipe",
			inputTemplate: { query: { $parameter: "query" } },
			parameterDefinitions: [
				{
					key: "query",
					label: "Query",
					type: "string",
					required: true,
				},
			],
			outputBindings: [],
		});
		expect(saved).toMatchObject({
			kind: "recipe",
			toolId: "system_search_tools",
			toolVersion: 1,
			effect: "read",
		});
	});

	test("uses optimistic versions for preferences and removal", async () => {
		const preferenceUpdate = mock(async () => ({ count: 0 }));
		await expect(
			updateAssistantPreferences(
				{
					assistantPreference: {
						findUnique: mock(async () => ({ id: "pref-1", version: 3 })),
						updateMany: preferenceUpdate,
					},
				} as never,
				actor,
				{
					responseStyle: "concise",
					responseDetail: "brief",
					chartPresentation: "table",
					expectedVersion: 2,
				},
			),
		).rejects.toThrow("changed; reload and retry");

		const remove = mock(async () => ({ count: 1 }));
		await removeAssistantSavedAction(
			{ assistantSavedAction: { updateMany: remove } } as never,
			actor,
			{ id: "action-1", expectedVersion: 2 },
		);
		expect(remove.mock.calls[0]?.[0]).toMatchObject({
			where: { id: "action-1", ownerUserId: 42, version: 2 },
			data: { activeKey: "action-1", version: { increment: 1 } },
		});
	});

	test("rejects undefined recipe markers before storing a runnable template", async () => {
		const create = mock(async (input) => input.data);
		const db = transactional({
			assistantSavedAction: {
				count: mock(async () => 0),
				aggregate: mock(async () => ({ _max: { displayOrder: null } })),
				create,
			},
		});
		await expect(
			createAssistantSavedAction(db as never, actor, {
				kind: "recipe",
				name: "Search tools",
				toolId: "system_search_tools",
				toolVersion: 1,
				inputTemplate: { query: { $parameter: "missing" } },
				parameterDefinitions: [
					{
						key: "query",
						label: "Query",
						type: "string",
						required: true,
					},
				],
				outputBindings: [],
			}),
		).rejects.toThrow("exactly match template markers");
		expect(create).not.toHaveBeenCalled();
		expect(() =>
			resolveAssistantRecipeInput({
				template: { query: { $parameter: "missing" } },
				definitions: [],
				parameters: {},
				timezone: "UTC",
			}),
		).toThrow("undefined parameter");
	});

	test("bounds recipe depth and persists only typed result parts", () => {
		let deep: unknown = "leaf";
		for (let index = 0; index < 14; index += 1) deep = { child: deep };
		expect(
			assistantSavedActionCreateSchema.safeParse({
				kind: "recipe",
				name: "Too deep",
				toolId: "system_search_tools",
				toolVersion: 1,
				inputTemplate: deep,
				parameterDefinitions: [],
				outputBindings: [],
			}).success,
		).toBe(false);
		expect(
			assistantSavedActionCreateSchema.safeParse({
				kind: "recipe",
				name: "Too large",
				toolId: "system_search_tools",
				toolVersion: 1,
				inputTemplate: Array.from({ length: 100 }, () => "x".repeat(400)),
				parameterDefinitions: [],
				outputBindings: [],
			}).success,
		).toBe(false);
		const parts = buildAssistantSavedActionResultParts(
			{
				toolId: "system_search_tools",
				title: "Search tools",
			} as never,
			{
				status: "success",
				data: { value: "```\n[unsafe](https://example.com)" },
				sources: [{ kind: "record", id: "record:1", label: "Record one" }],
			},
			"call-1",
		);
		expect(parts).toHaveLength(3);
		expect(
			parts.every(
				(part) =>
					part && typeof part === "object" && typeof part.type === "string",
			),
		).toBe(true);
		expect((parts[1] as { text: string }).text).not.toContain("```json");

		const requiresInputParts = buildAssistantSavedActionResultParts(
			{
				toolId: "sales_draft_from_request",
				title: "Draft sales request",
			} as never,
			{
				status: "requires_input",
				data: {
					type: "order",
					generationId: "88d3cb0f-32b9-4e3d-b5c3-1a1425374a83",
					seed: NEW_SALES_FORM_SEED_EXAMPLE,
					configurationScope: "sales-settings:1",
					configurationRevision: "catalog-revision-4",
					promptVersion: "sales-request-v4",
					provider: "openai",
					model: "gpt-5-mini",
					usage: { inputTokens: 120, outputTokens: 40 },
					unresolvedCount: NEW_SALES_FORM_SEED_EXAMPLE.unresolved.length,
				},
			},
			"call-2",
		);
		expect(requiresInputParts[0]).toMatchObject({
			data: { status: "complete" },
		});
		expect(requiresInputParts).toContainEqual(
			expect.objectContaining({ type: "data-assistant-order-draft" }),
		);
		expect(classifyAssistantSavedActionResultStatus("requires_input")).toEqual({
			completed: true,
			reusable: false,
		});
	});
});
