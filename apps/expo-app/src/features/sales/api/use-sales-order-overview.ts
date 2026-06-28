import { _trpc } from "@/components/static-trpc";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { useQuery } from "@tanstack/react-query";
import type { NewSalesFormType } from "../invoice-form/types";

type SaleOverviewInput = RouterInputs["sales"]["getSaleOverview"];

export function useSalesDocumentOverview(
	documentNo: string,
	type: NewSalesFormType = "order",
) {
	const saleInput: SaleOverviewInput = {
		orderNo: documentNo,
		salesType: type,
	};

	const sale = useQuery(
		_trpc.sales.getSaleOverview.queryOptions(saleInput, {
			enabled: !!documentNo,
		}),
	);

	const dispatch = useQuery(
		_trpc.dispatch.orderDispatchOverview.queryOptions(
			{
				salesNo: documentNo,
			},
			{
				enabled: type === "order" && !!documentNo,
			},
		),
	);

	return {
		sale,
		dispatch:
			type === "order"
				? dispatch
				: {
						...dispatch,
						data: null,
						isPending: false,
					},
	};
}

export function useSalesOrderOverview(orderNo: string) {
	return useSalesDocumentOverview(orderNo, "order");
}
