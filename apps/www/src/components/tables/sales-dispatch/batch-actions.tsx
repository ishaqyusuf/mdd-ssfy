import { useTable } from "..";
import { BatchAction } from "../batch-action";

export function BatchActions({}) {
    const ctx = useTable();
    if (!ctx.selectedRows?.length) return null;
    return <BatchAction></BatchAction>;
}

