import { useEffect, useState } from "react";
import { SalesType } from "../../types";
import {
    getSalesItemOverviewUseCase,
    GetSalesOverview,
} from "../use-case/sales-item-use-case";

export const useSalesOverviewData = (
    orderId,
    type: SalesType,
    autoLoad = false
) => {
    const [overview, setOverview] = useState<GetSalesOverview>();
    useEffect(() => {
        if (autoLoad) load();
    }, [autoLoad]);
    async function load() {
        const resp = await getSalesItemOverviewUseCase(orderId, type);
        setOverview(resp);
    }
    return {
        load,
        overview,
    };
};
