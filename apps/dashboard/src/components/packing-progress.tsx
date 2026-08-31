import { useMemo } from "react";
import { Progress } from "./(clean-code)/progress";
import { usePacking } from "@/hooks/use-sales-packing";
function qtyCount(qty: {
    qty?: number | null;
    lh?: number | null;
    rh?: number | null;
}) {
    const lh = Number(qty?.lh || 0);
    const rh = Number(qty?.rh || 0);
    const q = Number(qty?.qty || 0);
    return lh || rh ? lh + rh : q;
}

export function PackingProgress() {
    const { data } = usePacking();
    const { packedTotal, orderTotal } = useMemo(() => {
        if (data?.summary) {
            return {
                packedTotal: Number(data.summary.packed || 0),
                orderTotal: Number(data.summary.total || 0),
            };
        }

        const packedTotal =
            data.dispatchItems?.reduce(
                (acc, item) => acc + qtyCount(item.packedQty as any),
                0,
            ) || 0;
        const listedTotal =
            data.dispatchItems?.reduce(
                (acc, item) => acc + qtyCount(item.listedQty as any),
                0,
            ) || 0;
        const orderTotal =
            data.dispatchItems?.reduce(
                (acc, item) => acc + qtyCount(item.totalQty as any),
                0,
            ) || listedTotal;
        return {
            packedTotal,
            orderTotal,
        };
    }, [data.dispatchItems, data.summary]);

    return (
        <Progress>
            <Progress.ProgressBar
                className="w-full"
                showPercent
                label="Items packed"
                score={packedTotal}
                total={orderTotal}
            />
        </Progress>
    );
}
