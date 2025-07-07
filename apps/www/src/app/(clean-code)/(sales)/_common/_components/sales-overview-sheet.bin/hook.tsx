import { useEffect } from "react";
import { salesOverviewStore } from "./store";
import { loadPageData, tabLoaders } from "./helper";

export function useSalesOverview() {
    const ctx = salesOverviewStore();
    useEffect(() => {
        const tab = ctx.currentTab;
        const loaders = tabLoaders[tab];

        loaders?.map((dataKey, index) => {
            setTimeout(() => {
                loadPageData({
                    dataKey,
                });
            }, 300 * (index + 1));
        });
    }, [ctx.currentTab]);
}
