import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { z } from "zod";

const connectedAppSchema = z.object({
	id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
	name: z.string().trim().min(1).max(80),
	slug: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,99}$/),
});

type AssistantConnectedApp = z.infer<typeof connectedAppSchema>;
type AssistantToolkit = {
	slug: string;
	connection?: { isActive?: boolean };
};

function getConfiguredAssistantProviders(
	environment: Readonly<Record<string, string | undefined>> = process.env,
) {
	try {
		const value = JSON.parse(environment.ASSISTANT_CONNECTED_APPS_JSON || "[]");
		return z.array(connectedAppSchema).max(20).parse(value);
	} catch {
		return [];
	}
}

function createAssistantComposio(
	environment: Readonly<Record<string, string | undefined>>,
) {
	const apiKey = environment.COMPOSIO_API_KEY?.trim();
	return apiKey
		? new Composio({ apiKey, provider: new VercelProvider() })
		: null;
}

async function loadAssistantToolkits(
	userId: number,
	configured: AssistantConnectedApp[],
	environment: Readonly<Record<string, string | undefined>>,
) {
	const composio = createAssistantComposio(environment);
	if (!composio || !configured.length) return [];
	const session = await composio.create(String(userId), {
		manageConnections: false,
		workbench: { enable: false },
	});
	const response = await session.toolkits({
		toolkits: configured.map(({ slug }) => slug),
		limit: configured.length,
	});
	return response.items as AssistantToolkit[];
}

export async function getAssistantConnectedApps(
	actor: { userId: number },
	environment: Readonly<Record<string, string | undefined>> = process.env,
	loadToolkits: typeof loadAssistantToolkits = loadAssistantToolkits,
) {
	const configured = getConfiguredAssistantProviders(environment);
	if (!configured.length || !environment.COMPOSIO_API_KEY?.trim()) return [];
	try {
		const toolkits = await loadToolkits(actor.userId, configured, environment);
		const active = new Set(
			toolkits
				.filter(({ connection }) => connection?.isActive === true)
				.map(({ slug }) => slug),
		);
		return configured
			.filter(({ slug }) => active.has(slug))
			.map(({ id, name }) => ({ id, name }));
	} catch {
		return [];
	}
}

export async function resolveAssistantIntegrationIds(
	actor: { userId: number },
	ids: string[],
	environment: Readonly<Record<string, string | undefined>> = process.env,
	loadToolkits?: typeof loadAssistantToolkits,
) {
	const available = new Set(
		(await getAssistantConnectedApps(actor, environment, loadToolkits)).map(
			({ id }) => id,
		),
	);
	return [...new Set(ids)].filter((id) => available.has(id));
}

export async function getAssistantComposioTools(
	actor: { userId: number; scopeType: string; scopeId: string },
	mentionedIntegrationIds: string[],
	environment: Readonly<Record<string, string | undefined>> = process.env,
	createClient: typeof createAssistantComposio = createAssistantComposio,
	reauthorizeActor?: () => Promise<{
		userId: number;
		scopeType: string;
		scopeId: string;
	}>,
) {
	const configured = getConfiguredAssistantProviders(environment);
	const configuredIds = new Set(configured.map(({ id }) => id));
	if (
		!mentionedIntegrationIds.length ||
		mentionedIntegrationIds.some((id) => !configuredIds.has(id))
	) {
		return {};
	}
	const mentionedIds = new Set(mentionedIntegrationIds);
	const mentionedToolkits = configured
		.filter(({ id }) => mentionedIds.has(id))
		.map(({ slug }) => slug);
	const composio = createClient(environment);
	if (!composio) return {};
	try {
		const session = await composio.create(String(actor.userId), {
			toolkits: mentionedToolkits,
			manageConnections: false,
			workbench: { enable: false },
		});
		const tools = (await session.tools()) as Record<string, unknown>;
		const searchTool = tools.COMPOSIO_SEARCH_TOOLS as
			| { execute?: (...args: unknown[]) => unknown }
			| undefined;
		if (!searchTool?.execute) return {};
		return {
			COMPOSIO_SEARCH_TOOLS: {
				...searchTool,
				execute: async (...args: unknown[]) => {
					const currentActor = await reauthorizeActor?.();
					if (
						currentActor &&
						(currentActor.userId !== actor.userId ||
							currentActor.scopeType !== actor.scopeType ||
							currentActor.scopeId !== actor.scopeId)
					) {
						throw new Error("Assistant actor scope is no longer available");
					}
					return searchTool.execute?.(...args);
				},
			},
		};
	} catch {
		return {};
	}
}

export function getAssistantConnectorManagementUrl(
	environment: Readonly<Record<string, string | undefined>> = process.env,
) {
	const raw = environment.ASSISTANT_CONNECTOR_MANAGEMENT_URL?.trim();
	if (!raw) return null;
	try {
		const url = new URL(raw);
		return url.protocol === "https:" ? url.toString() : null;
	} catch {
		return raw.startsWith("/") ? raw : null;
	}
}
