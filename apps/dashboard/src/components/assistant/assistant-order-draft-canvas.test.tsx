import { describe, expect, test } from "bun:test";
import { NEW_SALES_FORM_SEED_EXAMPLE } from "@gnd/sales/sales-form-core";
import { renderToStaticMarkup } from "react-dom/server";
import { SalesRequestReviewContent } from "../forms/new-sales-form/request-generation-panel";
import {
	AssistantOrderDraftPreparationStatus,
	AssistantOrderDraftPricing,
	AssistantOrderDraftProvenance,
	prepareAssistantOrderDraftCanvas,
	selectAssistantOrderDraftPreparation,
} from "./assistant-order-draft-canvas";

const draft = {
	id: "order-draft-1",
	data: {
		type: "order" as const,
		generationId: "88d3cb0f-32b9-4e3d-b5c3-1a1425374a83",
		seed: {
			...NEW_SALES_FORM_SEED_EXAMPLE,
			unresolved: [
				{
					lineUid: "line-1",
					stepId: null,
					field: "size",
					status: "unsupported" as const,
					reason: "Door size is required",
				},
			],
		},
		configurationScope: "sales-settings:1",
		configurationRevision: "catalog-revision-4",
		promptVersion: "sales-request-v4",
		provider: "openai",
		model: "gpt-5-mini",
		usage: { inputTokens: 120, outputTokens: 40 },
		unresolvedCount: 1,
	},
};

describe("assistant order draft canvas", () => {
	test("validates freshness even when unresolved fields block initialization", async () => {
		let validations = 0;
		const result = await prepareAssistantOrderDraftCanvas({
			draft,
			baseRecord: {} as never,
			routeData: {} as never,
			profileRecords: [],
			validateConfigurationRevision: async () => {
				validations += 1;
				return "catalog-revision-4";
			},
			resolveComponents: async () => {
				throw new Error("initializer should not resolve blocked components");
			},
		});
		expect(validations).toBe(1);
		expect(result).toMatchObject({ status: "blocked", reason: "unresolved" });
	});

	test("returns a terminal stale state before native initialization", async () => {
		let resolved = false;
		const result = await prepareAssistantOrderDraftCanvas({
			draft,
			baseRecord: {} as never,
			routeData: {} as never,
			profileRecords: [],
			validateConfigurationRevision: async () => "new-revision",
			resolveComponents: async () => {
				resolved = true;
				return [];
			},
		});
		expect(result.status).toBe("configuration-stale");
		expect(resolved).toBe(false);
	});

	test("announces loading and terminal blocked or query failure states", () => {
		const loading = renderToStaticMarkup(
			<AssistantOrderDraftPreparationStatus preparation={null} />,
		);
		const blocked = renderToStaticMarkup(
			<AssistantOrderDraftPreparationStatus
				preparation={{
					status: "blocked",
					reason: "initializer-issue",
					issues: [
						{
							lineUid: "line-1",
							stepId: null,
							reason: "unresolved-facts",
						},
					],
				}}
			/>,
		);
		const failed = renderToStaticMarkup(
			<AssistantOrderDraftPreparationStatus
				preparation={{ status: "error", error: new Error("query failed") }}
			/>,
		);
		expect(loading).toContain('role="status"');
		expect(blocked).toContain('role="alert"');
		expect(blocked).toContain("1 initializer issue");
		expect(failed).toContain('role="alert"');
		expect(failed).toContain("could not be prepared");
	});

	test("never presents preparation from a previously selected draft", () => {
		const prior = {
			draftId: "order-draft-1",
			result: {
				status: "error" as const,
				error: new Error("prior draft"),
			},
		};
		expect(selectAssistantOrderDraftPreparation("order-draft-1", prior)).toBe(
			prior.result,
		);
		expect(
			selectAssistantOrderDraftPreparation("order-draft-2", prior),
		).toBeNull();
	});

	test("shows durable source authority and native Sales pricing", () => {
		const provenance = renderToStaticMarkup(
			<AssistantOrderDraftProvenance draft={draft} />,
		);
		const pricing = renderToStaticMarkup(
			<AssistantOrderDraftPricing
				preparation={
					{
						status: "ready",
						proposal: {
							record: {
								lineItems: [
									{
										uid: "line-1",
										title: "Solid core door",
										qty: 2,
										unitPrice: 125,
										lineTotal: 250,
									},
								],
								extraCosts: [
									{ type: "Delivery", label: "Delivery", amount: 50 },
								],
								summary: { subTotal: 300, taxTotal: 21, grandTotal: 321 },
							},
						},
					} as never
				}
			/>,
		);
		expect(provenance).toContain("Source evidence");
		expect(provenance).toContain("catalog-revision-4");
		expect(provenance).toContain("openai · gpt-5-mini · sales-request-v4");
		expect(pricing).toContain("Authoritative pricing");
		expect(pricing).toContain("Solid core door");
		expect(pricing).toContain("$321.00");
	});

	test("reuses the native request review for services, delivery and unresolved evidence", () => {
		const markup = renderToStaticMarkup(
			<SalesRequestReviewContent
				model={{
					lines: [
						{
							uid: "service-line",
							quantity: 2,
							selections: [
								{
									stepId: 10,
									stepTitle: "Product",
									values: ["Installation"],
									kind: "single",
								},
							],
							hptRows: [],
							mouldingRows: [],
							serviceRows: [{ service: "Site installation", quantity: 2 }],
						},
					],
					delivery: { option: "delivery", amount: 50 },
					unresolved: [
						{
							lineLabel: "Line 1",
							stepLabel: "Size",
							field: "width",
							status: "ambiguous",
							reason: "Choose one width",
						},
					],
					warnings: [],
					defaults: [],
				}}
			/>,
		);
		expect(markup).toContain("Site installation");
		expect(markup).toContain("$50.00 stated delivery charge");
		expect(markup).toContain("Line 1 · Size · width");
		expect(markup).toContain("Choose one width");
	});
});
