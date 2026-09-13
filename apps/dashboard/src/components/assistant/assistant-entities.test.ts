import { describe, expect, test } from "bun:test";
import {
	assistantAppRoutes,
	assistantCommunityEntityRoute,
	assistantSalesEntityMode,
	buildAssistantDocumentUrl,
	findAssistantDocumentEntity,
	parseAssistantEntity,
} from "./assistant-entities";

describe("assistant entity navigation", () => {
	test("accepts typed GND records and reviewed app destinations", () => {
		expect(
			parseAssistantEntity({
				kind: "customer",
				id: "CUST-0042",
				label: "Acme Builders",
			}),
		).toEqual({ kind: "customer", id: "CUST-0042", label: "Acme Builders" });
		expect(assistantAppRoutes["sales-orders"]).toBe("/sales-book/orders");
		expect(
			assistantSalesEntityMode(
				parseAssistantEntity({
					kind: "order",
					id: "09502PC",
					label: "Quote 09502PC",
					salesType: "quote",
				}) as Extract<
					NonNullable<ReturnType<typeof parseAssistantEntity>>,
					{ kind: "order" }
				>,
			),
		).toBe("quote");
	});

	test("builds the authenticated document endpoint from the opaque ID", () => {
		expect(buildAssistantDocumentUrl("doc:09502 PC")).toBe(
			"/api/assistant/documents/doc%3A09502%20PC",
		);
	});

	test("drops stale numeric IDs and unreviewed app routes", () => {
		expect(
			parseAssistantEntity({
				kind: "community",
				id: "deleted-project",
				label: "Old project",
			}),
		).toBe(null);
		expect(
			parseAssistantEntity({
				kind: "app",
				id: "settings/admin",
				label: "Unreviewed route",
			}),
		).toBe(null);
	});

	test("accepts a Community unit deep-link identity", () => {
		const entity = parseAssistantEntity({
			kind: "community",
			communityType: "unit",
			id: "42",
			slug: "north-ridge-lot-4",
			label: "Lot 4/A",
		});
		expect(entity).toEqual({
			kind: "community",
			communityType: "unit",
			id: "42",
			slug: "north-ridge-lot-4",
			label: "Lot 4/A",
		});
		expect(
			assistantCommunityEntityRoute(
				entity as Extract<NonNullable<typeof entity>, { kind: "community" }>,
			),
		).toBe("/community/project-units/north-ridge-lot-4");
	});

	test("restores a document selection only from persisted trusted parts", () => {
		const messages = [
			{
				parts: [
					{
						type: "data-assistant-entity",
						data: { kind: "document", id: "doc:1", label: "Invoice" },
					},
				],
			},
		];
		expect(findAssistantDocumentEntity(messages, "doc:1")).toEqual({
			kind: "document",
			id: "doc:1",
			label: "Invoice",
		});
		expect(findAssistantDocumentEntity(messages, "deleted-doc")).toBe(null);
	});
});
