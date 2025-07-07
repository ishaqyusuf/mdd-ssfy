"use client";

import {
    loadSalesWithoutStats,
    updateSalesStats,
} from "@/app/(clean-code)/(sales)/_backward-compat/sales-stat.action";
import Button from "@/components/common/button";
import { chunker } from "@/lib/chunker";

export default function SalesSatDeployPage({}) {
    return (
        <div>
            <Button
                onClick={async () => {
                    const resp = await loadSalesWithoutStats();
                    console.log(resp);
                    chunker({
                        worker: updateSalesStats,
                        list: resp,
                        chunkSize: 20,
                    });
                }}
            >
                Start
            </Button>
        </div>
    );
}
