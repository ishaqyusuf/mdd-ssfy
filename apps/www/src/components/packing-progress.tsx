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
        const controlPacked = Number(data?.order?.control?.packed?.total || 0);
        const controlPending = Number(
            data?.order?.control?.pendingPacking?.total || 0,
        );
        const controlTotal = controlPacked + controlPending;
        if (controlTotal > 0) {
            return {
                packedTotal: controlPacked,
                orderTotal: controlTotal,
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
    }, [data.dispatchItems]);

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
