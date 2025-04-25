import { useState } from "react";
import { getCachedDispatchers } from "@/actions/cache/get-cached-dispatchers";
import { getCachedProductionUsers } from "@/actions/cache/get-cached-production-users";
import { getSalesDispatchDataAction } from "@/actions/get-sales-dispatch-data";
import { getSalesItemsOverviewAction } from "@/actions/get-sales-items-overview-action";
import { getSalesOverviewAction } from "@/actions/get-sales-overview";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { timeout } from "@/lib/timeout";
import { createContextFactory } from "@/utils/context-factory";
import { useAsyncMemo } from "use-async-memo";

const { useContext: useSaleOverview, Provider: SalesOverviewProvider } =
    createContextFactory(function () {
        const ctx = useSalesOverviewQuery();
        const loader = async () => {
            await timeout(100);
            const res = await getSalesOverviewAction(
                ctx.params["sales-overview-id"],
            );
            console.log({ res });
            return res;
        };

        const data = useAsyncMemo(loader, [ctx.refreshTok]);
        return {
            data,
        };
    });

const { useContext: useDispatch, Provider: DispatchProvider } =
    createContextFactory(function () {
        const ctx = useSalesOverviewQuery();
        const drivers = useAsyncMemo(async () => {
            await timeout(80);
            return await getCachedDispatchers();
        }, []);
        const loader = async () => {
            await timeout(100);
            const res = await getSalesDispatchDataAction(
                ctx.params["sales-overview-id"],
            );

            return res;
        };
        const customerQuery = useCustomerOverviewQuery();
        const data = useAsyncMemo(loader, [ctx.refreshTok]);
        // const [selections, setSelections] = useState({});
        const [openForm, setOpenForm] = useState(false);
        return {
            openForm,
            setOpenForm,
            // selections,
            // setSelections,
            data,
            ctx,
            drivers,
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
        const loader = async () => {
            await timeout(100);
            const res = await getSalesItemsOverviewAction(
                ctx.params["sales-overview-id"],
            );

            return res;
        };
        const customerQuery = useCustomerOverviewQuery();
        const data = useAsyncMemo(loader, [ctx.refreshTok]);
        const [selections, setSelections] = useState({});

        return {
            selections,
            setSelections,
            data,
            ctx,
            users,
        };
    });
// export { useProduction };
