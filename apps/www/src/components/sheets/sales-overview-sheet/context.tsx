import { useEffect, useState } from "react";

import { getCachedProductionUsers } from "@/actions/cache/get-cached-production-users";

import {
    createSalesDispatchItemsSchema,
    createSalesDispatchSchema,
} from "@/actions/schema";
import { useSalesControlAction } from "@/hooks/use-sales-control-action";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { timeout } from "@/lib/timeout";
import createContextFactory from "@/utils/context-factory";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAsyncMemo } from "use-async-memo";
import z from "zod";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";

const { useContext: useSaleOverview, Provider: SalesOverviewProvider } =
    createContextFactory(function () {
        const ctx = useSalesOverviewQuery();
        const { data } = useQuery(
            ctx.salesQuery.trpc.sales.getSaleOverview.queryOptions(
                {
                    orderNo: ctx.params["sales-overview-id"],
                    salesType: ctx.params["sales-type"] as any,
                },
                {
                    enabled: !!ctx.params["sales-overview-id"],
                },
            ),
        );
        return {
            data,
        };
    });

const { useContext: useDispatch, Provider: DispatchProvider } =
    createContextFactory(function () {
        const ctx = useSalesOverviewQuery();
        const trpc = useTRPC();
        const { data: drivers } = useQuery(
            trpc.hrm.getDrivers.queryOptions({}),
        );
        const { data, refetch } = useQuery(
            trpc.dispatch.orderDispatchOverview.queryOptions(
                {
                    salesNo: ctx.params["sales-overview-id"],
                },
                {
                    enabled: !!ctx.params["sales-overview-id"],
                },
            ),
        );
        const [openForm, setOpenForm] = useState(false);
        const bachWorker = useSalesControlAction({
            onFinish() {},
        });
        const formSchema = z.object({
            delivery: createSalesDispatchSchema,
            itemData: createSalesDispatchItemsSchema,
        });
        const form = useForm<z.infer<typeof formSchema>>({
            resolver: zodResolver(formSchema),
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
            ctx,
            drivers: drivers?.map((a) => ({
                ...a,
                id: a.id?.toString(),
            })),
            bachWorker,
        };
    });

export {
    useSaleOverview,
    SalesOverviewProvider,
    DispatchProvider,
    useDispatch,
};

export const { useContext: useProduction, Provider: ProductionProvider } =
    createContextFactory(function () {
        const ctx = useSalesOverviewQuery();
        const users = useAsyncMemo(async () => {
            await timeout(80);
            return await getCachedProductionUsers();
        }, []);
        const trpc = useTRPC();
        const { data, refetch } = useQuery(
            trpc.sales.productionOverview.queryOptions(
                {
                    salesNo: ctx.params["sales-overview-id"],
                    assignedToId: ctx?.assignedTo,
                },
                {
                    enabled: !!ctx.params["sales-overview-id"],
                },
            ),
        );
        const [selections, setSelections] = useState({});

        return {
            selections,
            setSelections,
            data,
            ctx,
            users,
            refetch,
        };
    });
