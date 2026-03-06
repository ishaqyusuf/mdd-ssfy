import { RouterOutputs } from "@api/trpc/routers/_app";
import { Progress } from "./(clean-code)/progress";
import { usePacking } from "@/hooks/use-sales-packing";
import { qtyMatrixSum } from "@sales/utils/sales-control";

export function PackingProgress() {
    const { data } = usePacking();

    return (
        <Progress>
            <Progress.ProgressBar
                className="w-full"
                showPercent
                label="Items packed"
                score={
                    qtyMatrixSum(
                        ...(data.dispatchItems?.map((a) => a.packedQty) as any),
                    )?.qty || 0
                }
                total={
                    qtyMatrixSum(
                        ...(data.dispatchItems?.map((a) => a.listedQty) as any),
                    )?.qty || 0
                }
            />
        </Progress>
    );
}
