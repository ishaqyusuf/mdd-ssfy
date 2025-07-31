import { usePacking, usePackingItem } from "@/hooks/use-sales-packing";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { formatDate } from "@gnd/utils/dayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QtyLabel } from "./qty-label";
import ConfirmBtn from "./confirm-button";
import { useAuth } from "@/hooks/use-auth";

export function PackingItemListings({}) {
    const packing = usePacking();
    const { item } = usePackingItem();
    if (!item?.packingHistory?.length)
        return (
            <div className="border-t flex justify-center p-4">
                <span className="text-sm text-muted-foreground  ">
                    No packing history found. Please add a packing item
                </span>
            </div>
        );
    const trpc = useTRPC();
    const qc = useQueryClient();
    const deletePacking = useMutation(
        trpc.dispatch.deletePackingItem.mutationOptions({
            onSuccess() {
                qc.invalidateQueries({
                    queryKey: trpc.dispatch.dispatchOverview.queryKey(),
                });
            },
        }),
    );
    const auth = useAuth();
    return (
        <div className="p-4 border-t">
            <h5 className="text-sm font-medium mb-3">Packing History</h5>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Packed By</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {item.packingHistory.map((historyItem) => (
                        <TableRow key={historyItem.id}>
                            <TableCell>{historyItem.packedBy}</TableCell>
                            <TableCell>
                                <QtyLabel {...historyItem.qty} />
                            </TableCell>
                            <TableCell>
                                {formatDate(historyItem.date)}
                            </TableCell>
                            <TableCell>{historyItem.note || "-"}</TableCell>
                            <TableCell>
                                <ConfirmBtn
                                    trash
                                    disabled={deletePacking.isPending}
                                    size="icon"
                                    onClick={() =>
                                        deletePacking.mutate({
                                            deleteBy: auth.name,
                                            salesId: packing.data.order.id,
                                            packingId: historyItem.id,
                                            packingUid: historyItem.packingUid,
                                        })
                                    }
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

