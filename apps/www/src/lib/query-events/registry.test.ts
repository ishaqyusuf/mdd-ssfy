import { describe, expect, it } from "bun:test";
import {
	MUTATION_QUERY_EVENTS,
	QUERY_EVENTS,
	getMutationRoute,
	resolveMutationQueryEvents,
} from "./registry";

describe("query event mutation registry", () => {
	it("keeps the critical-domain rollout registered", () => {
		expect(Object.keys(MUTATION_QUERY_EVENTS).length).toBe(78);
		expect(Object.keys(QUERY_EVENTS).length).toBe(15);
	});

	it("reads the tRPC mutation route from its typed mutation key", () => {
		expect(getMutationRoute([["sales", "updatePriority"]])).toBe(
			"sales.updatePriority",
		);
		expect(getMutationRoute([["sales", "notRegistered"]])).toBe(null);
		expect(getMutationRoute(["sales.updatePriority"])).toBe(null);
	});

	it("derives query events from a registered mutation route", () => {
		expect(
			resolveMutationQueryEvents({
				mutationKey: [["salesPaymentProcessor", "applyPayment"]],
			}),
		).toEqual([{ name: "sales.payment.changed" }]);
		expect(
			resolveMutationQueryEvents({
				mutationKey: [["sales", "markLatestPaymentReviewed"]],
			}),
		).toEqual([{ name: "sales.payment.changed" }]);
	});

	it("publishes customer changes after customer and address saves", () => {
		for (const mutation of ["createCustomer", "createCustomerAddress"]) {
			expect(
				resolveMutationQueryEvents({
					mutationKey: [["customers", mutation]],
				}),
			).toEqual([{ name: "customer.changed" }]);
		}
	});

	it("scopes a reviewed payment event to its sale overview", () => {
		expect(
			resolveMutationQueryEvents({
				data: {
					order: {
						id: 44,
						orderId: "08894LM",
						type: "order",
					},
				},
				mutationKey: [["sales", "markLatestPaymentReviewed"]],
			}),
		).toEqual([
			{
				name: "sales.payment.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
					],
				},
			},
		]);
	});

	it("scopes a batch payment review event to every reviewed order", () => {
		expect(
			resolveMutationQueryEvents({
				data: {
					reviewed: [
						{
							paymentId: 91,
							salesId: 44,
							orderId: "08894LM",
							type: "order",
						},
						{
							paymentId: 92,
							salesId: 45,
							orderId: "08895LM",
							type: "order",
						},
					],
					skipped: [],
				},
				mutationKey: [["sales", "markPaymentsReviewed"]],
			}),
		).toEqual([
			{
				name: "sales.payment.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
						{
							orderNo: "08895LM",
							salesId: 45,
							salesType: "order",
						},
					],
				},
			},
		]);
	});

	it("scopes an applied payment event to every affected sale overview", () => {
		expect(
			resolveMutationQueryEvents({
				data: {
					appliedSalesIds: [44, 45],
					appliedSales: [
						{ orderId: "08894LM", salesId: 44 },
						{ orderId: "08895LM", salesId: 45 },
					],
					status: "success",
					terminalPaymentSession: null,
				},
				mutationKey: [["salesPaymentProcessor", "applyPayment"]],
			}),
		).toEqual([
			{
				name: "sales.payment.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
						{
							orderNo: "08895LM",
							salesId: 45,
							salesType: "order",
						},
					],
				},
			},
		]);
	});

	it("does not suppress a completed terminal payment with applied sales", () => {
		expect(
			resolveMutationQueryEvents({
				data: {
					appliedSalesIds: [44],
					appliedSales: [{ orderId: "08894LM", salesId: 44 }],
					status: "success",
					terminalPaymentSession: {
						squareCheckoutId: "checkout-1",
						squarePaymentId: "payment-1",
						status: "COMPLETED",
					},
				},
				mutationKey: [["salesPaymentProcessor", "applyPayment"]],
			}),
		).toEqual([
			{
				name: "sales.payment.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
					],
				},
			},
		]);
	});

	it("scopes a completed online checkout payment to its affected sales", () => {
		expect(
			resolveMutationQueryEvents({
				data: {
					appliedSales: [
						{
							orderId: "08894LM",
							salesId: 44,
							salesType: "order",
						},
					],
					status: "COMPLETED",
				},
				mutationKey: [["checkout", "verifyPayment"]],
			}),
		).toEqual([
			{
				name: "sales.payment.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
					],
				},
			},
		]);
	});

	it("does not invalidate sales while a payment is still pending", () => {
		expect(
			resolveMutationQueryEvents({
				data: {
					status: "PENDING",
				},
				mutationKey: [["checkout", "verifyPayment"]],
			}),
		).toEqual([]);
		expect(
			resolveMutationQueryEvents({
				data: {
					appliedSales: [],
					terminalPaymentSession: {
						id: "pending-terminal",
					},
				},
				mutationKey: [["salesPaymentProcessor", "applyPayment"]],
			}),
		).toEqual([]);
	});

	it("scopes a finalized quote to the quote event family", () => {
		expect(
			resolveMutationQueryEvents({
				data: {
					orderId: "08894LM",
					salesId: 44,
					type: "quote",
				},
				mutationKey: [["newSalesForm", "saveFinal"]],
			}),
		).toEqual([
			{
				name: "sales.quote.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "quote",
						},
					],
				},
			},
		]);
	});

	it("scopes autosaved edits from the mutation result", () => {
		expect(
			resolveMutationQueryEvents({
				data: {
					orderId: "08894LM",
					salesId: 44,
					type: "order",
				},
				mutationKey: [["newSalesForm", "saveDraft"]],
			}),
		).toEqual([
			{
				name: "sales.order.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
					],
				},
			},
		]);
	});

	it("scopes a copied sale using the returned slug and target type", () => {
		expect(
			resolveMutationQueryEvents({
				data: {
					id: 44,
					slug: "08894LM",
				},
				mutationKey: [["sales", "copySale"]],
				variables: {
					as: "quote",
					salesUid: "08893LM",
					type: "order",
				},
			}),
		).toEqual([
			{
				name: "sales.order.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "quote",
						},
					],
				},
			},
			{
				name: "sales.quote.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "quote",
						},
					],
				},
			},
		]);
	});

	it("scopes a moved sale to both the deleted source and created target", () => {
		expect(
			resolveMutationQueryEvents({
				data: {
					id: 44,
					slug: "08894LM",
				},
				mutationKey: [["sales", "moveSale"]],
				variables: {
					salesUid: "08893LM",
					to: "quote",
					type: "order",
				},
			}),
		).toEqual([
			{
				name: "sales.order.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "quote",
						},
						{
							orderNo: "08893LM",
							salesType: "order",
						},
					],
				},
			},
			{
				name: "sales.quote.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "quote",
						},
						{
							orderNo: "08893LM",
							salesType: "order",
						},
					],
				},
			},
		]);
	});

	it("scopes fulfillment events from the returned sale reference", () => {
		expect(
			resolveMutationQueryEvents({
				data: {
					ok: true,
					sale: {
						id: 44,
						orderId: "08894LM",
						type: "order",
					},
				},
				mutationKey: [["inventories", "fulfillInventoryDispatch"]],
			}),
		).toEqual([
			{
				name: "inventory.fulfillment.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
					],
				},
			},
		]);
	});

	it("merges explicit metadata events without duplicates", () => {
		expect(
			resolveMutationQueryEvents({
				metaEvents: ["sales.payment.changed", "page-tabs.changed"],
				mutationKey: [["sales", "updatePaymentMethod"]],
			}),
		).toEqual([
			{ name: "sales.payment.changed" },
			{ name: "page-tabs.changed" },
		]);
	});

	it("applies an explicit metadata scope to route and metadata events", () => {
		expect(
			resolveMutationQueryEvents({
				metaEvents: ["sales.payment.changed", "page-tabs.changed"],
				metaScope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
					],
				},
				mutationKey: [["sales", "updatePaymentMethod"]],
			}),
		).toEqual([
			{
				name: "sales.payment.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
					],
				},
			},
			{
				name: "page-tabs.changed",
				scope: {
					sales: [
						{
							orderNo: "08894LM",
							salesId: 44,
							salesType: "order",
						},
					],
				},
			},
		]);
	});

	it("supports opting a mutation out of automatic route events", () => {
		expect(
			resolveMutationQueryEvents({
				metaEvents: false,
				mutationKey: [["sales", "updatePriority"]],
			}),
		).toEqual([]);
	});

	it("covers the active production list and dashboard families", () => {
		const routes = QUERY_EVENTS["sales.production.changed"].targets.map(
			(target) => target.route,
		);

		for (const route of [
			"filters.salesProductions",
			"sales.productions",
			"sales.productionsV2",
			"sales.productionDashboard",
			"sales.productionDashboardV2",
			"sales.productionTasks",
		]) {
			expect(routes).toContain(route);
		}
	});
});
