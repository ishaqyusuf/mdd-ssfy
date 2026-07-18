import {
	useQueryEvents,
	useTypedQueryInvalidation,
} from "@/lib/query-events/runtime";
import type { QueryEventScope, SalesQueryRef } from "@/lib/query-events/types";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@gnd/ui/tanstack";

type SalesDocumentType = "order" | "quote" | "sales";
type SalesScopeInput = SalesQueryRef | readonly SalesQueryRef[] | null;

function getSalesScope(
	sales: SalesScopeInput | undefined,
): QueryEventScope | undefined {
	if (!sales) return;
	const refs = Array.isArray(sales) ? sales : [sales];
	return refs.length ? { sales: refs } : undefined;
}

export function useSalesQueryClient(defaultSales?: SalesScopeInput) {
	const qc = useQueryClient();
	const trpc = useTRPC();
	const queryEvents = useQueryEvents();
	const typedInvalidate = useTypedQueryInvalidation();
	const emit = (
		name: Parameters<typeof queryEvents.emit>[0],
		sales: SalesScopeInput | undefined = defaultSales,
	) => queryEvents.emit(name, getSalesScope(sales));
	const invalidateSaleOverview = (
		sales: SalesScopeInput | undefined = defaultSales,
	) => {
		const refs = sales ? (Array.isArray(sales) ? sales : [sales]) : [];
		if (!refs.length) return typedInvalidate.path("sales.getSaleOverview");

		return Promise.all(
			refs.map((sale) =>
				typedInvalidate.query("sales.getSaleOverview", {
					orderNo: sale.orderNo,
					salesType: sale.salesType,
				}),
			),
		);
	};
	const invalidate = {
		salesList: (sales?: SalesScopeInput) => emit("sales.order.changed", sales),
		quoteList: (sales?: SalesScopeInput) => emit("sales.quote.changed", sales),
		productionOverview: () => typedInvalidate.path("sales.productionOverview"),
		saleOverview: invalidateSaleOverview,
		salesDocumentChanged: (
			_type?: SalesDocumentType | null,
			sales?: SalesScopeInput,
		) =>
			_type === "quote"
				? invalidate.quoteList(sales)
				: invalidate.salesList(sales),
		salesPaymentChanged: (sales?: SalesScopeInput) =>
			emit("sales.payment.changed", sales),
	};
	const events = {
		assignmentUpdated: (sales?: SalesScopeInput) =>
			emit("sales.production.changed", sales),
		assignmentSubmissionUpdated: () => emit("sales.production.changed"),
		dispatchUpdated: (sales?: SalesScopeInput) =>
			emit("sales.dispatch.changed", sales),
		fulfillmentUpdated: (sales?: SalesScopeInput) =>
			emit("inventory.fulfillment.changed", sales),
		quoteCreated: (sales?: SalesScopeInput) =>
			emit("sales.quote.changed", sales),
		salesCreated: (sales?: SalesScopeInput) =>
			emit("sales.order.changed", sales),
		salesPaymentUpdated: (sales?: SalesScopeInput) =>
			emit("sales.payment.changed", sales),
		salesStatReset: (sales?: SalesScopeInput) =>
			Promise.all([
				emit("sales.order.changed", sales),
				emit("sales.production.changed", sales),
			]),
		productionUpdated: (sales?: SalesScopeInput) =>
			emit("sales.production.changed", sales),
	};
	return {
		...events,
		trpc,
		qc,
		events,
		invalidate,
	};
}
