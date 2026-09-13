import { type EmbeddingModel, tool } from "ai";
import { createToolIndex } from "toolpick";
import { z } from "zod";
import { getAssistantRegistryPublicDefinitions } from "./registry";
import embeddingFixture from "./selection-benchmark-embeddings.json";

export const assistantSelectionBenchmarkCases = [
	{ query: "where is order 09502PC", expected: "sales_find_orders" },
	{ query: "start a new customer purchase", expected: "sales_create_order" },
	{ query: "look up Jordan’s customer record", expected: "customers_find" },
	{ query: "is this item in stock", expected: "inventory_check_status" },
	{
		query: "what stage is manufacturing at",
		expected: "production_check_status",
	},
	{
		query: "has the delivery been packed",
		expected: "fulfillment_check_status",
	},
	{ query: "find a community project", expected: "community_search" },
	{ query: "turn the result into a PDF", expected: "documents_generate_pdf" },
	{
		query: "Which orders belong to Ada Millwork?",
		expected: "sales_find_orders",
	},
	{
		query: "Can you tell me what's happening with 09502PC right now?",
		expected: "sales_get_order_status",
	},
	{
		query: "What is stopping 09502PC from moving forward?",
		expected: "sales_explain_blockers",
	},
	{
		query: "Show me every recent change made to 09502PC",
		expected: "sales_get_timeline",
	},
	{ query: "find the customer named Jordan", expected: "customers_find" },
	{
		query: "I need Ada Millwork's account overview",
		expected: "customers_get_summary",
	},
	{
		query: "What has Ada Millwork purchased before?",
		expected: "customers_get_order_history",
	},
	{
		query: "show the current production assignments",
		expected: "production_check_status",
	},
	{
		query: "what work is due on the production schedule",
		expected: "production_get_schedule",
	},
	{
		query: "how many oak jambs are available after allocations",
		expected: "inventory_check_status",
	},
	{
		query: "show inbound demand and material shortages",
		expected: "inventory_get_demand",
	},
	{
		query: "is order 09502PC packed and ready for delivery",
		expected: "fulfillment_check_status",
	},
	{
		query: "why is fulfillment blocked for order 09502PC",
		expected: "fulfillment_explain_exceptions",
	},
	{
		query: "find the North Ridge community project",
		expected: "community_search",
	},
	{
		query: "summarize units jobs and invoices for North Ridge",
		expected: "community_get_project_summary",
	},
	{
		query: "list every unit in the North Ridge project",
		expected: "community_list_units",
	},
] as const;

const cases = assistantSelectionBenchmarkCases;

function tokens(value: string) {
	return new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

function deterministicSelect(query: string, maxTools = 3) {
	const queryTokens = tokens(query);
	return getAssistantRegistryPublicDefinitions()
		.map((definition) => {
			const definitionTokens = tokens(
				`${definition.toolId} ${definition.title} ${definition.description}`,
			);
			return {
				name: definition.toolId,
				score: [...queryTokens].filter((term) => definitionTokens.has(term))
					.length,
			};
		})
		.filter(({ score }) => score > 0)
		.sort(
			(left, right) =>
				right.score - left.score || left.name.localeCompare(right.name),
		)
		.slice(0, maxTools)
		.map(({ name }) => name);
}

function score(results: string[][]) {
	return {
		top1:
			results.filter((result, index) => result[0] === cases[index]?.expected)
				.length / cases.length,
		top3:
			results.filter((result, index) =>
				result.includes(cases[index]?.expected ?? ""),
			).length / cases.length,
	};
}

export async function benchmarkAssistantToolSelection() {
	const definitions = getAssistantRegistryPublicDefinitions();
	const scale = embeddingFixture.scale;
	const toolVectors = embeddingFixture.tools as Record<string, number[]>;
	const fixtureEmbeddingModel = {
		specificationVersion: "v3",
		provider: "gnd-benchmark",
		modelId: "frozen-natural-language-v1",
		maxEmbeddingsPerCall: Number.POSITIVE_INFINITY,
		supportsParallelCalls: true,
		async doEmbed({ values }: { values: string[] }) {
			return {
				embeddings: values.map((value) => {
					const definition = definitions.find((candidate) =>
						value.startsWith(`${candidate.toolId}:`),
					);
					const queryIndex = cases.findIndex(({ query }) => query === value);
					const quantized = definition
						? definition.toolId === "system_request_capability"
							? Array.from({ length: embeddingFixture.dimension }, () => 0)
							: toolVectors[definition.toolId]
						: embeddingFixture.queries[queryIndex];
					if (!quantized)
						throw new Error("Embedding benchmark fixture drifted");
					return quantized.map((component) => component / scale);
				}),
				usage: { tokens: 0 },
				warnings: [],
			};
		},
	} as EmbeddingModel;
	const index = createToolIndex(
		Object.fromEntries(
			definitions.map((definition) => [
				definition.toolId,
				tool({
					description: `${definition.title}. ${definition.description} Domain: ${definition.domain}.`,
					inputSchema: z.object({}),
				}),
			]),
		),
		{ strategy: "semantic", embeddingModel: fixtureEmbeddingModel },
	);
	await index.warmUp();

	const semanticStart = performance.now();
	const semanticResults = await Promise.all(
		cases.map(({ query }) =>
			index.select(query, { maxTools: 3, adaptive: false }),
		),
	);
	const semanticLatencyMs = performance.now() - semanticStart;

	const deterministicStart = performance.now();
	const deterministicResults = cases.map(({ query }) =>
		deterministicSelect(query),
	);
	const deterministicLatencyMs = performance.now() - deterministicStart;
	const semanticScore = score(semanticResults);
	const deterministicScore = score(deterministicResults);

	return {
		total: cases.length,
		fixture: {
			model: embeddingFixture.model,
			dimension: embeddingFixture.dimension,
		},
		semantic: { ...semanticScore, latencyMs: semanticLatencyMs },
		deterministic: {
			...deterministicScore,
			latencyMs: deterministicLatencyMs,
		},
		decision:
			semanticScore.top3 > deterministicScore.top3
				? ("evaluate_semantic_embeddings" as const)
				: ("keep_embeddings_optional" as const),
		misses: cases.flatMap((testCase, index) =>
			semanticResults[index]?.includes(testCase.expected)
				? []
				: [{ ...testCase, selected: semanticResults[index] ?? [] }],
		),
	};
}
