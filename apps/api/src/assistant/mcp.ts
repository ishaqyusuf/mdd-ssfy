import { createMCPClient } from "@ai-sdk/mcp";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAssistantResultEnvelopeSchema } from "./contracts";
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
		throw new Error("Assistant actor scope is no longer available");
	}
}

export function createAssistantMcpServer(
	actor: AssistantToolActor,
	resolveCurrentActor: () => Promise<AssistantToolActor> = async () => actor,
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
				const currentActor = await resolveCurrentActor();
				assertSameAssistantScope(actor, currentActor);
				const result = await executeRegisteredAssistantTool(
					currentActor,
					{
						toolId: definition.toolId,
						version: definition.version,
						input,
					},
					{},
					{ signal: extra.signal },
				);
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
) {
	const executableDefinitions = getExecutableAssistantDefinitions(actor);
	const server = createAssistantMcpServer(actor, resolveCurrentActor);
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
