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
import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

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
    const deletePacking = useMutation(
        trpc.dispatch.deletePackingItem.mutationOptions({}),
    );
    async function onDelete(id) {}
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
                            <TableCell>{historyItem.qty}</TableCell>
                            <TableCell>
                                {formatDate(historyItem.date)}
                            </TableCell>
                            <TableCell>{historyItem.note || "-"}</TableCell>
                            <TableCell>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onDelete(historyItem.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

