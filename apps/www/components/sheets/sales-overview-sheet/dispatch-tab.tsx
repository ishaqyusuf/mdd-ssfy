import { getSalesDispatchDataAction } from "@/actions/get-sales-dispatch-data";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { timeout } from "@/lib/timeout";
import { createContextFactory } from "@/utils/context-factory";
import { useAsyncMemo } from "use-async-memo";

import { DispatchFooter } from "./dispatch-footer";
import { DispatchProgressChart } from "./dispatch-progress-chart";

const { useContext: useDispatch, Provider } = createContextFactory(function () {
    const ctx = useSalesOverviewQuery();
    const users = useAsyncMemo(async () => {
        await timeout(80);
        // return await getCachedProductionUsers();
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

    return {
        // selections,
        // setSelections,
        data,
        ctx,
        users,
    };
});
export { useDispatch };
export function DispatchTab({}) {
    return (
        <Provider args={[]}>
            <Content />
            <DispatchFooter />
        </Provider>
    );
}
function Content() {
    const { data, ctx } = useDispatch();
    return (
        <DataSkeletonProvider value={{ loading: !data?.id } as any}>
            <div>
                <DispatchProgressChart data={data?.progress || {}} />
            </div>
        </DataSkeletonProvider>
    );
}
