import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	assistantCapabilityStateSchema,
	assistantEffectSchema,
	assistantEntityReferenceSchema,
	assistantInvalidationTagSchema,
	assistantToolIdentitySchema,
	createAssistantResultEnvelopeSchema,
} from "./contracts";

const orderResultEnvelopeSchema = createAssistantResultEnvelopeSchema(
	z.object({ orderId: z.string().regex(/^\d{5}[A-Z]{2}$/) }).strict(),
);

describe("assistant public contracts", () => {
	test("accepts a versioned Midday-style tool identity", () => {
		expect(
			assistantToolIdentitySchema.parse({
				toolId: "sales_find_orders",
				toolVersion: 1,
			}),
		).toEqual({ toolId: "sales_find_orders", toolVersion: 1 });
	});

	test("rejects unstable or unversioned tool identities", () => {
		expect(() =>
			assistantToolIdentitySchema.parse({
				toolId: "sales.findOrders",
				toolVersion: 0,
			}),
		).toThrow();
	});

	test("uses the approved capability and effect vocabulary", () => {
		expect(assistantCapabilityStateSchema.parse("implemented")).toBe(
			"implemented",
		);
		expect(assistantEffectSchema.parse("external_send")).toBe("external_send");
		expect(() => assistantCapabilityStateSchema.parse("available")).toThrow();
	});

	test("parses a typed result with source provenance and next actions", () => {
		const result = orderResultEnvelopeSchema.parse({
			status: "success",
			data: { orderId: "09502PC" },
			sources: [
				{
					kind: "record",
					id: "sale:9502",
					label: "Order 09502PC",
					href: "/sales/orders/9502",
				},
			],
			observedAt: "2026-09-12T12:00:00.000Z",
			warnings: [],
			allowedNextActions: [
				{ toolId: "sales_get_order_status", toolVersion: 1 },
			],
		});

		expect(result.status).toBe("success");
		expect(result.sources[0]?.kind).toBe("record");
	});

	test("validates tool data with its registered output schema", () => {
		expect(() =>
			orderResultEnvelopeSchema.parse({
				status: "success",
				data: { orderId: 9502 },
				sources: [],
				observedAt: "2026-09-12T12:00:00.000Z",
				warnings: [],
				allowedNextActions: [],
			}),
		).toThrow();
	});

	test("rejects unknown result and artifact states", () => {
		expect(() =>
			orderResultEnvelopeSchema.parse({
				status: "done",
				sources: [],
				observedAt: "2026-09-12T12:00:00.000Z",
				warnings: [],
				artifact: { id: "doc:1", status: "complete" },
				allowedNextActions: [],
			}),
		).toThrow();
	});

	test("keeps job and artifact lifecycles distinct", () => {
		expect(
			orderResultEnvelopeSchema.parse({
				status: "pending",
				sources: [],
				observedAt: "2026-09-12T12:00:00.000Z",
				warnings: [],
				job: { id: "job:1", status: "succeeded" },
				allowedNextActions: [],
			}).job?.status,
		).toBe("succeeded");

		expect(() =>
			orderResultEnvelopeSchema.parse({
				status: "pending",
				sources: [],
				observedAt: "2026-09-12T12:00:00.000Z",
				warnings: [],
				artifact: { id: "doc:1", status: "succeeded" },
				allowedNextActions: [],
			}),
		).toThrow();
	});

	test("accepts only typed dashboard entity references", () => {
		expect(
			assistantEntityReferenceSchema.parse({
				kind: "order",
				id: "09502PC",
				label: "Order 09502PC",
			}),
		).toEqual({ kind: "order", id: "09502PC", label: "Order 09502PC" });
		expect(
			assistantEntityReferenceSchema.parse({
				kind: "document",
				id: "doc:1",
				label: "Invoice 09502PC",
				mimeType: "application/pdf",
			}),
		).toMatchObject({ kind: "document", mimeType: "application/pdf" });
		expect(() =>
			assistantEntityReferenceSchema.parse({
				kind: "app",
				id: "admin/secrets",
				label: "Unsafe destination",
			}),
		).toThrow();
		expect(() =>
			assistantEntityReferenceSchema.parse({
				kind: "inventory",
				id: "not-an-integer",
				label: "Missing product",
			}),
		).toThrow();
		expect(() =>
			assistantEntityReferenceSchema.parse({
				kind: "community",
				id: "9007199254740993",
				label: "Unsafe numeric ID",
			}),
		).toThrow();
	});

	test("keeps assistant invalidation tags on the reviewed allowlist", () => {
		expect(assistantInvalidationTagSchema.parse("sales.orders")).toBe(
			"sales.orders",
		);
		expect(() =>
			assistantInvalidationTagSchema.parse("database.all"),
		).toThrow();

		const result = orderResultEnvelopeSchema.parse({
			status: "success",
			data: { orderId: "09502PC" },
			sources: [],
			observedAt: "2026-09-13T12:00:00.000Z",
			warnings: [],
			allowedNextActions: [],
			entities: [{ kind: "order", id: "09502PC", label: "Order 09502PC" }],
			invalidationTags: ["sales.orders"],
		});
		expect(result.entities?.[0]?.kind).toBe("order");
		expect(result.invalidationTags).toEqual(["sales.orders"]);
	});
});
