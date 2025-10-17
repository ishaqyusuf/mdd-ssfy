"use client";

import { useState } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { useRouter } from "next/navigation";
import { ISalesOrder } from "@/types/sales";
import { toast } from "sonner";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import { Cell, DateCellContent } from "../columns/base-columns";
import StatusBadge from "../status-badge";

export function PickupStatusCell({ order }: { order: ISalesOrder }) {
    const [isPending, startTransition] = useTransition();
    const route = useRouter();
    async function submit(status) {
        startTransition(async () => {
            //   await updateWorkOrderStatus(workOrder.id, status);
            setIsOpen(false);
            toast.success("Status Updated!");
            // route.refresh();
        });
    }
    const [isOpen, setIsOpen] = useState(false);
    return (
        <Cell>
            {!order.pickup ? (
                <div>
                    <StatusBadge>pending</StatusBadge>
                </div>
            ) : (
                <>
                    <div className="">{order.pickup?.pickupBy}</div>
                    <DateCellContent>{order.pickup.pickupAt}</DateCellContent>
                </>
            )}
        </Cell>
    );
}
