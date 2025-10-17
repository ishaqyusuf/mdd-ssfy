import {
    BatchAction,
    BatchDelete,
} from "@gnd/ui/custom/data-table/batch-action";
import { useMemo } from "react";

import { deleteSalesByOrderIds } from "@/app/(clean-code)/(sales)/_common/data-actions/sales-actions";
import { useTable } from "@gnd/ui/custom/data-table/index";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/custom/icons";

export function BatchActions({}) {
    const ctx = useTable();
    const slugs = useMemo(() => {
        return ctx.selectedRows?.map((r) => (r.original as any)?.orderId);
    }, [ctx.selectedRows]);

    if (!ctx.selectedRows?.length) return null;

    return (
        <BatchAction>
            <Button>
                <Icons.print className="size-4" />
            </Button>
            <BatchDelete
                onClick={async () => {
                    // await deleteSalesByOrderIds(slugs);
                }}
            />
        </BatchAction>
    );
}

