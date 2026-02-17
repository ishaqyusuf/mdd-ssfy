import { BatchAction } from "@gnd/ui/custom/data-table/batch-action";
import { useTable } from "@gnd/ui/data-table";

export function BatchActions({}) {
    const ctx = useTable();
    if (!ctx.selectedRows?.length) return null;
    return <BatchAction></BatchAction>;
}

