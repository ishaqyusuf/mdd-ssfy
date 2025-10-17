import { SalesItem } from "@/data-access/sales";
import { sum } from "@/lib/utils";
import { useEffect, useState } from "react";
import { composeTotalDeliverables } from "@/data/compose-sales";

interface SalesStatus {
    payment: {
        status: "paid" | "part paid" | "late" | "pending";
        progress: number;
    };
    production: {
        status: "idle" | "completed" | "in progress" | "late";
        progress: number;
    };
    dispatch: {
        status: "idle" | "completed" | "half way" | "late";
        progress: number;
    };
    productionAssignment: {
        status: "all assigned" | "non assigned";
        progress: number;
    };
}
export function useSalesStatus(item: SalesItem) {
    const [status, setStatus] = useState<SalesStatus>(null);
    useEffect(() => {
        //
        const totalDeliverables = composeTotalDeliverables(item);
    }, []);

    return {
        status,
    };
}
