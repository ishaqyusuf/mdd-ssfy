import { describe, expect, test } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";
import type { AssistantActor } from "./actor";
import {
	prepareAssistantSalesDraft,
	saveAssistantSalesDraft,
} from "./sales-draft-save";

const input = {
	conversationId: "chat-1",
	generationId: "2b957a84-23ff-4691-991d-d42427807612",
	customerId: 34,
};
const actor = {
	userId: 1,
	scopeType: "user",
	scopeId: "1",
	grants: { editOrders: true },
} as AssistantActor;
type Dependencies = NonNullable<
	Parameters<typeof prepareAssistantSalesDraft>[3]
>;

function fixture(type: "order" | "quote" = "order") {
	let price = 50;
	let profiles: {
		id: number;
		title: string;
		coefficient: number;
		meta: null;
	}[] = [];
	let empty = false;
	let savedSale: { orderId: string; slug: string } | null = null;
	const saves: unknown[] = [];
	const ctx = {
		userId: 1,
		db: {
			assistantSalesRequestSession: {
				findFirst: async () => ({
					completedAt: new Date("2026-09-22T12:00:00Z"),
				}),
			},
			taxes: { findMany: async () => [] },
			customerTypes: { findMany: async () => profiles },
		},
	} as unknown as TRPCContext;
	const deps = {
		requireAnyOperationalPermission: async () => ({}),
		getAssistantSalesDraftHandoff: async () =>
			savedSale
				? { savedSale, preview: null }
				: {
						savedSale: null,
						preview: {
							type,
							sourceText: "Two handles",
							seed: {
								schemaVersion: 2,
								unresolved: [],
								lineItems: empty
									? []
									: [
											{
												uid: "line-1",
												qty: 2,
												formSteps: [
													{ stepId: 1, prodUid: "hardware" },
													{ stepId: 2, prodUid: "handle" },
												],
											},
										],
							},
						},
					},
		bootstrapNewSalesForm: async () => ({
			type,
			salesId: null,
			slug: null,
			version: `new-${Math.random()}`,
			customer: { name: "Test customer" },
			form: { customerProfileId: null, createdAt: new Date().toISOString() },
			lineItems: [],
			extraCosts: [],
			summary: { taxRate: 0 },
			settings: {},
		}),
		resolveNewSalesCustomer: async () => ({
			profileId: null,
			billing: { id: 3 },
			shipping: {},
		}),
		getNewSalesFormStepRouting: async () => ({
			rootStepUid: "item-type",
			stepsById: { 1: "item-type", 2: "product" },
			stepsByUid: {
				"item-type": { id: 1, uid: "item-type", title: "Item Type" },
				product: { id: 2, uid: "product", title: "Product" },
			},
			composedRouter: {
				hardware: { routeSequence: [{ uid: "product" }], config: {} },
			},
		}),
		getSalesFormCatalog: async (_ctx: unknown, query: { stepId: number }) => ({
			components:
				query.stepId === 1
					? [{ id: 1, uid: "hardware", title: "Hardware", basePrice: 0 }]
					: [{ id: 2, uid: "handle", title: "Handle", basePrice: price }],
		}),
		recalculateNewSalesForm: async (
			_ctx: unknown,
			query: { lineItems: { lineTotal: number }[]; paymentMethod: string },
		) => {
			const total = query.lineItems.reduce(
				(sum, line) => sum + line.lineTotal,
				0,
			);
			const ccc =
				query.paymentMethod === "Credit Card" ? Math.round(total * 3) / 100 : 0;
			return {
				subTotal: total,
				grandTotal: total,
				taxRate: 0,
				taxTotal: 0,
				ccc,
				totalWithCcc: total + ccc,
			};
		},
		saveDraftNewSalesForm: async (_ctx: unknown, payload: unknown) => {
			saves.push(payload);
			savedSale = { orderId: "QA001", slug: "QA001" };
			return savedSale;
		},
	} as unknown as Dependencies;
	return {
		ctx,
		deps,
		saves,
		changePrice: () => {
			price = 60;
		},
		defaultTier: () => {
			profiles = [{ id: 7, title: "Tier 1", coefficient: 0.65, meta: null }];
		},
		emptySeed: () => {
			empty = true;
		},
		consumed: () => {
			savedSale = { orderId: "QA001", slug: "QA001" };
		},
	};
}

describe("Assistant reviewed draft save", () => {
	test("uses the native default pricing profile and card-fee total", async () => {
		const f = fixture();
		f.defaultTier();
		const prepared = await prepareAssistantSalesDraft(
			f.ctx,
			actor,
			input,
			f.deps,
		);
		expect(prepared.review).toMatchObject({
			subtotal: 153.84,
			cardFee: 4.62,
			total: 158.46,
		});
		await saveAssistantSalesDraft(
			f.ctx,
			actor,
			{ ...input, revision: prepared.review!.revision },
			f.deps,
		);
		expect(f.saves[0]).toMatchObject({
			meta: { customerProfileId: 7, paymentMethod: "Credit Card" },
		});
	});
	test("an empty generated seed cannot become a blank saved order", async () => {
		const f = fixture();
		f.emptySeed();
		await expect(
			prepareAssistantSalesDraft(f.ctx, actor, input, f.deps),
		).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
		expect(f.saves).toHaveLength(0);
	});
	for (const type of ["order", "quote"] as const)
		test(`saves the reviewed ${type} once through the native draft command`, async () => {
			const f = fixture(type);
			const prepared = await prepareAssistantSalesDraft(
				f.ctx,
				actor,
				input,
				f.deps,
			);
			expect(prepared.review?.lineItems[0]).toMatchObject({
				quantity: 2,
				total: 100,
			});
			const saveInput = { ...input, revision: prepared.review!.revision };
			expect(
				await saveAssistantSalesDraft(f.ctx, actor, saveInput, f.deps),
			).toEqual({ savedSale: { orderId: "QA001", slug: "QA001" } });
			expect(
				await saveAssistantSalesDraft(f.ctx, actor, saveInput, f.deps),
			).toEqual({ savedSale: { orderId: "QA001", slug: "QA001" } });
			expect(f.saves).toHaveLength(1);
			expect(f.saves[0]).toMatchObject({
				type,
				autosave: false,
				commitIntent: "draft",
				assistantHandoff: {
					conversationId: input.conversationId,
					generationId: input.generationId,
				},
				meta: { customerId: 34, customerRequestText: "Two handles" },
			});
		});
	test("a price change requires another review without a write", async () => {
		const f = fixture();
		const prepared = await prepareAssistantSalesDraft(
			f.ctx,
			actor,
			input,
			f.deps,
		);
		f.changePrice();
		await expect(
			saveAssistantSalesDraft(
				f.ctx,
				actor,
				{ ...input, revision: prepared.review!.revision },
				f.deps,
			),
		).rejects.toMatchObject({ code: "CONFLICT" });
		expect(f.saves).toHaveLength(0);
	});
	test("an already saved request returns its receipt, including a simultaneous native save", async () => {
		const f = fixture();
		const prepared = await prepareAssistantSalesDraft(
			f.ctx,
			actor,
			input,
			f.deps,
		);
		f.deps.saveDraftNewSalesForm = async () => {
			f.consumed();
			throw new TRPCError({ code: "CONFLICT" });
		};
		expect(
			await saveAssistantSalesDraft(
				f.ctx,
				actor,
				{ ...input, revision: prepared.review!.revision },
				f.deps,
			),
		).toEqual({ savedSale: { orderId: "QA001", slug: "QA001" } });
	});
	test("missing edit permission cannot prepare or save", async () => {
		const f = fixture();
		const denied = { ...actor, grants: {} };
		await expect(
			prepareAssistantSalesDraft(f.ctx, denied, input, f.deps),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			saveAssistantSalesDraft(
				f.ctx,
				denied,
				{ ...input, revision: "a".repeat(64) },
				f.deps,
			),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(f.saves).toHaveLength(0);
	});
});
