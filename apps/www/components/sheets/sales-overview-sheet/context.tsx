import { getSalesOverviewAction } from "@/actions/get-sales-overview";
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

export { useSaleOverview, SalesOverviewProvider };
