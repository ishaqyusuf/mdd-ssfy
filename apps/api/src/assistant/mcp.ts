import { createMCPClient } from "@ai-sdk/mcp";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AssistantAccessDisabledError } from "./access-governance";
import { createAssistantResultEnvelopeSchema } from "./contracts";
import {
	type AssistantOutcome,
	assistantEffectMayCommit,
	presentAssistantOutcome,
} from "./outcomes";
import { createAssistantReadRecovery } from "./read-recovery";

type CaptureToolFailure = (error: unknown, context: {
	toolCallId: string; toolId: string; toolVersion: number; toolInput: unknown;
	effect: string; outcome: AssistantOutcome["kind"]; attempt?: 1 | 2; retrying?: boolean;
}) => Promise<{ reference: string; retryId?: string; retryExpiresAt?: string }>;

class AssistantScopeUnavailableError extends Error {
	readonly code = "FORBIDDEN";
	constructor() { super("Assistant actor scope is no longer available"); }
}
import {
	ASSISTANT_TOOL_CATALOG_VERSION,
	type AssistantToolActor,
	executeRegisteredAssistantTool,
	getExecutableAssistantDefinitions,
} from "./registry";

function annotations(effect: string) {
	return {
		readOnlyHint: effect === "read",
		destructiveHint: effect === "destructive",
		idempotentHint: effect === "read",
		openWorldHint: false,
	};
}

function assertSameAssistantScope(
	initialActor: AssistantToolActor,
	currentActor: AssistantToolActor,
) {
	if (
		initialActor.userId !== currentActor.userId ||
		initialActor.scopeType !== currentActor.scopeType ||
		initialActor.scopeId !== currentActor.scopeId
	) {
		throw new AssistantScopeUnavailableError();
	}
}

export function createAssistantMcpServer(
	actor: AssistantToolActor,
	resolveCurrentActor: () => Promise<AssistantToolActor> = async () => actor,
	recordExecution?: (input: {
		toolCallId: string;
		step: number;
		toolId: string;
		toolVersion: number;
		effect: string;
		status: "succeeded" | "failed" | "cancelled";
		toolInput: unknown;
		result?: unknown;
		durationMs: number;
		recovery?: { attemptCount: 2; firstFailureReference?: string };
	}) => Promise<void>,
	captureFailure?: CaptureToolFailure,
) {
	const server = new McpServer(
		{
			name: "gnd-prodesk-assistant",
			version: ASSISTANT_TOOL_CATALOG_VERSION,
			title: "GND ProDesk Assistant",
			description: "Permission-aware GND business operations tools",
		},
		{
			instructions:
				"Tools execute only within the authenticated actor and organization scope. Returned records remain server-authorized.",
		},
	);

	let executionStep = 0;
	const recoverRead = createAssistantReadRecovery();
	for (const definition of getExecutableAssistantDefinitions(actor)) {
		server.registerTool(
			definition.toolId,
			{
				title: definition.title,
				description: definition.description,
				inputSchema: definition.inputSchema,
				outputSchema: createAssistantResultEnvelopeSchema(
					definition.outputSchema,
				),
				annotations: annotations(definition.effect),
				_meta: {
					"gnd/toolVersion": definition.version,
					"gnd/effect": definition.effect,
					"gnd/domain": definition.domain,
				},
			} as never,
			(async (input: unknown, extra: { signal: AbortSignal }) => {
				const startedAt = Date.now();
				const toolCallId = randomUUID();
				const step = ++executionStep;
				let result: unknown;
				const attemptState: { count: 1 | 2 } = { count: 1 };
				let firstFailureReference: string | undefined;
				try {
					result = await recoverRead({ effect: definition.effect, signal: extra.signal,
						onRetry: async error => {
							firstFailureReference = (await captureFailure?.(error, { toolCallId, toolId: definition.toolId, toolVersion: definition.version, toolInput: input, effect: definition.effect, outcome: "temporary", attempt: 1, retrying: true }))?.reference;
						},
						operation: async currentAttempt => {
						attemptState.count = currentAttempt;
						const currentActor = await resolveCurrentActor();
					assertSameAssistantScope(actor, currentActor);
					return executeRegisteredAssistantTool(
						currentActor,
						{
							toolId: definition.toolId,
							version: definition.version,
							input,
						},
						{},
						{ signal: extra.signal },
					);
					} });
				} catch (error) {
					const kind: AssistantOutcome["kind"] = extra.signal.aborted
						? "cancelled"
						: error instanceof AssistantScopeUnavailableError ||
								error instanceof AssistantAccessDisabledError
							? "denied"
							: assistantEffectMayCommit(definition.effect)
								? "uncertain"
								: "temporary";
					let reference: string | undefined;
					let retryId: string | undefined;
					let retryExpiresAt: string | undefined;
					try {
						if (kind !== "cancelled") {
							const captured = await captureFailure?.(error, { toolCallId, toolId: definition.toolId, toolVersion: definition.version, toolInput: input, effect: definition.effect, outcome: kind, attempt: attemptState.count });
							reference = captured?.reference;
							retryId = captured?.retryId;
							retryExpiresAt = captured?.retryExpiresAt;
						}
					} catch { /* Capturing diagnostics cannot replace the business outcome. */ }
					try {
						await recordExecution?.({
							toolCallId,
							step,
							toolId: definition.toolId,
							toolVersion: definition.version,
							effect: definition.effect,
							status: kind === "cancelled" ? "cancelled" : "failed",
							toolInput: input,
							durationMs: Date.now() - startedAt,
							...(attemptState.count === 2 ? { recovery: { attemptCount: 2 as const, firstFailureReference } } : {}),
						});
					} catch {
						console.error("Unable to record failed Assistant tool execution", {
							code: "assistant_tool_execution_record_failed",
							toolId: definition.toolId,
							toolVersion: definition.version,
							step,
						});
					}
					const outcome = { kind, ...(reference ? { reference } : {}) };
					return {
						isError: true,
						content: [{ type: "text", text: presentAssistantOutcome(outcome).message }],
						_meta: {
							assistantOutcome: outcome,
							...(retryId ? { assistantReadRetryId: retryId } : {}),
							...(retryExpiresAt
								? { assistantReadRetryExpiresAt: retryExpiresAt }
								: {}),
						},
					};
				}
				const status = (result as { status?: unknown }).status;
				await recordExecution?.({
					toolCallId,
					step,
					toolId: definition.toolId,
					toolVersion: definition.version,
					effect: definition.effect,
					status:
						status === "success" || status === "partial"
							? "succeeded"
							: "failed",
					toolInput: input,
					result,
					durationMs: Date.now() - startedAt,
					...(attemptState.count === 2 ? { recovery: { attemptCount: 2 as const, firstFailureReference } } : {}),
				});
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
					structuredContent: result,
				};
			}) as never,
		);
	}

	return server;
}

export async function createAssistantMcpExecutionClient(
	actor: AssistantToolActor,
	resolveCurrentActor?: () => Promise<AssistantToolActor>,
	recordExecution?: Parameters<typeof createAssistantMcpServer>[2],
	captureFailure?: CaptureToolFailure,
) {
	const executableDefinitions = getExecutableAssistantDefinitions(actor);
	const server = createAssistantMcpServer(
		actor,
		resolveCurrentActor,
		recordExecution,
		captureFailure,
	);
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	let client: Awaited<ReturnType<typeof createMCPClient>> | undefined;
	try {
		await server.connect(serverTransport);
		client = await createMCPClient({
			transport: clientTransport,
			name: `gnd-assistant-${actor.userId}`,
			version: ASSISTANT_TOOL_CATALOG_VERSION,
		});
		const definitions = await client.listTools();
		const tools = client.toolsFromDefinitions(definitions);
		let closed = false;
		return {
			definitions,
			tools,
			toolEffects: Object.fromEntries(
				executableDefinitions.map((definition) => [
					definition.toolId,
					definition.effect,
				]),
			),
			async close() {
				if (closed) return;
				closed = true;
				await Promise.allSettled([client?.close(), server.close()]);
			},
		};
	} catch (error) {
		await Promise.allSettled([client?.close(), server.close()]);
		throw error;
	}
}
import { randomUUID } from "node:crypto";
