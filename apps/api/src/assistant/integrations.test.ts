import { describe, expect, test } from "bun:test";
import {
	getAssistantComposioTools,
	getAssistantConnectedApps,
	getAssistantConnectorManagementUrl,
	isAssistantExternalToolingEnabled,
	resolveAssistantIntegrationIds,
} from "./integrations";

describe("assistant integrations", () => {
	const environment = {
		COMPOSIO_API_KEY: "configured",
		ASSISTANT_CONNECTED_APPS_JSON: JSON.stringify([
			{ id: "quickbooks", name: "QuickBooks", slug: "quickbooks" },
		]),
		ASSISTANT_CONNECTOR_MANAGEMENT_URL: "/settings/integrations",
	};
	const loadToolkits = async (userId: number) =>
		userId === 42
			? [{ slug: "quickbooks", connection: { isActive: true } }]
			: [];

	test("returns only actor-scoped active Composio toolkits", async () => {
		expect(
			await getAssistantConnectedApps(
				{ userId: 42 },
				environment,
				loadToolkits,
			),
		).toEqual([{ id: "quickbooks", name: "QuickBooks" }]);
		expect(
			await resolveAssistantIntegrationIds(
				{ userId: 42 },
				["forged", "quickbooks", "quickbooks"],
				environment,
				loadToolkits,
			),
		).toEqual(["quickbooks"]);
		expect(
			await getAssistantConnectedApps({ userId: 7 }, environment, loadToolkits),
		).toEqual([]);
		expect(getAssistantConnectorManagementUrl(environment)).toBe(
			"/settings/integrations",
		);
	});

	test("fails closed without Composio or on provider errors", async () => {
		expect(
			await getAssistantConnectedApps(
				{ userId: 42 },
				{ ...environment, COMPOSIO_API_KEY: "" },
				loadToolkits,
			),
		).toEqual([]);
		expect(
			await getAssistantConnectedApps({ userId: 42 }, environment, async () => {
				throw new Error("provider unavailable");
			}),
		).toEqual([]);
	});

	test("honors read-only and external tool-category operator controls", async () => {
		for (const control of [
			{ ASSISTANT_READ_ONLY_CANARY: "true" },
			{ ASSISTANT_EXTERNAL_TOOLS_ENABLED: "false" },
			{ ASSISTANT_DISABLED_TOOL_DOMAINS: "integrations" },
			{ ASSISTANT_DISABLED_TOOL_EFFECTS: "external_send" },
		]) {
			const controlled = { ...environment, ...control };
			expect(isAssistantExternalToolingEnabled(controlled)).toBe(false);
			expect(
				await getAssistantConnectedApps(
					{ userId: 42 },
					controlled,
					loadToolkits,
				),
			).toEqual([]);
		}
	});

	test("loads only the read-only search tool for a mentioned app and reauthorizes execution", async () => {
		let sessionUserId: string | undefined;
		let reauthorized = 0;
		const execute = async () => ({ successful: true });
		const actor = {
			userId: 42,
			scopeType: "organization",
			scopeId: "7",
		};
		const createClient = (() =>
			({
				create: async (userId: string) => {
					sessionUserId = userId;
					return {
						tools: async () => ({
							COMPOSIO_SEARCH_TOOLS: { execute },
							COMPOSIO_MULTI_EXECUTE_TOOL: { execute },
						}),
					};
				},
			}) as never) as never;
		const tools = await getAssistantComposioTools(
			actor,
			["quickbooks"],
			environment,
			createClient,
			async () => {
				reauthorized += 1;
				return actor;
			},
		);
		expect(sessionUserId).toBe("42");
		expect(Object.keys(tools)).toEqual(["COMPOSIO_SEARCH_TOOLS"]);
		expect(
			await (
				tools.COMPOSIO_SEARCH_TOOLS as { execute: () => Promise<unknown> }
			).execute(),
		).toEqual({ successful: true });
		expect(reauthorized).toBe(1);
		expect(
			await getAssistantComposioTools(actor, [], environment, createClient),
		).toEqual({});
	});
});
