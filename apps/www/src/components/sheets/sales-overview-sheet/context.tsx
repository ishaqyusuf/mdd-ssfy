import { useState } from "react";

import { getCachedProductionUsers } from "@/actions/cache/get-cached-production-users";

import {
	createSalesDispatchItemsSchema,
	createSalesDispatchSchema,
} from "@/actions/schema";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useZodForm } from "@/hooks/use-zod-form";
import { timeout } from "@/lib/timeout";
import { useTRPC } from "@/trpc/client";
import createContextFactory from "@/utils/context-factory";
import { useQuery } from "@gnd/ui/tanstack";
import { useSession } from "next-auth/react";
import { useAsyncMemo } from "use-async-memo";
import z from "zod";

const { useContext: useSaleOverview, Provider: SalesOverviewProvider } =
	createContextFactory(() => {
		const query = useSalesOverviewQuery();
		const trpc = useTRPC();
		const { status } = useSession();
		const { data } = useQuery(
			trpc.sales.getSaleOverview.queryOptions(
				{
					orderNo: query.params["sales-overview-id"],
					salesType: query.params["sales-type"] === "quote" ? "quote" : "order",
				},
				{
					enabled:
						!!query.params["sales-overview-id"] &&
						status === "authenticated",
				},
			),
		);
		return {
			query,
			data,
		};
	});

const { useContext: useDispatch, Provider: DispatchProvider } =
	createContextFactory(() => {
		const query = useSalesOverviewQuery();
		const trpc = useTRPC();
		const { data: drivers } = useQuery(trpc.hrm.getDrivers.queryOptions({}));
		const { data, refetch } = useQuery(
			trpc.dispatch.orderDispatchOverview.queryOptions(
				{
					salesNo: query.params["sales-overview-id"],
				},
				{
					enabled: !!query.params["sales-overview-id"],
				},
			),
		);
		const [openForm, setOpenForm] = useState(false);
		const formSchema = z.object({
			delivery: createSalesDispatchSchema,
			itemData: createSalesDispatchItemsSchema,
		});
		const form = useZodForm(formSchema, {
			defaultValues: {
				delivery: {
					deliveryMode: "delivery",
				},
				itemData: {},
			},
		});
		return {
			openForm,
			setOpenForm,
			form,
			formSchema,
			// selections,
			// setSelections,
			data,
			query,
			drivers: drivers?.map((a) => ({
				...a,
				id: a.id?.toString(),
			})),
		};
	});

export {
	useSaleOverview,
	SalesOverviewProvider,
	DispatchProvider,
	useDispatch,
};

export const { useContext: useProduction, Provider: ProductionProvider } =
	createContextFactory(() => {
		const query = useSalesOverviewQuery();
		const users = useAsyncMemo(async () => {
			await timeout(80);
			return await getCachedProductionUsers();
		}, []);
		const trpc = useTRPC();
		const { data, refetch } = useQuery(
			trpc.sales.productionOverview.queryOptions(
				{
					salesNo: query.params["sales-overview-id"],
					assignedToId: query?.assignedTo,
				},
				{
					enabled: !!query.params["sales-overview-id"],
				},
			),
		);
		const [selections, setSelections] = useState({});

		return {
			selections,
			setSelections,
			data,
			query,
			users,
			refetch,
		};
	});
