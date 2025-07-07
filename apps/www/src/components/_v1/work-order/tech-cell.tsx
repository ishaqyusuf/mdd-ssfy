"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignTech } from "@/app/(v1)/_actions/customer-services/assign-tech";
import { updateWorkOrderStatus } from "@/app/(v1)/_actions/customer-services/update-status";
import { useAppSelector } from "@/store";
import { IWorkOrder } from "@/types/customer-service";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";

import { Cell, StatusCell } from "../columns/base-columns";

interface Props {
    workOrder: IWorkOrder;
}
export default function WorkOrderTechCell({ workOrder }: Props) {
    const techEmployees = useAppSelector((s) => s.slicers.staticTechEmployees);
    const [isPending, startTransition] = useTransition();
    const route = useRouter();
    async function submit(e) {
        startTransition(async () => {
            await assignTech(workOrder.id, e.id);
            setIsOpen(false);
            toast.success("Tech Assigned");
            route.refresh();
        });
    }
    const [isOpen, setIsOpen] = useState(false);
    return (
        <Cell>
            <div className="">
                <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-full border-dashed"
                        >
                            <span className="whitespace-nowrap">
                                {workOrder.tech
                                    ? workOrder.tech.name
                                    : "Select"}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="grid w-[185px] gap-2 p-4 text-sm"
                    >
                        {techEmployees?.map((e) => (
                            <DropdownMenuItem
                                onClick={(_e) => submit(e)}
                                className="cursor-pointer hover:bg-accent"
                                key={e.id}
                            >
                                {e.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </Cell>
    );
}
export function WorkOrderStatusCell({ workOrder }: Props) {
    const [isPending, startTransition] = useTransition();
    const route = useRouter();
    async function submit(status) {
        startTransition(async () => {
            await updateWorkOrderStatus(workOrder.id, status);
            setIsOpen(false);
            toast.success("Status Updated!");
            // route.refresh();
        });
    }
    const [isOpen, setIsOpen] = useState(false);
    return (
        <Cell>
            <div className="">
                <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 p-0">
                            <StatusCell status={workOrder.status} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="grid w-[185px] gap-2 p-4 text-sm"
                    >
                        {[
                            "Pending",
                            "Scheduled",
                            "Incomplete",
                            "Completed",
                        ]?.map((e) => (
                            <DropdownMenuItem
                                onClick={(_e) => submit(e)}
                                className="cursor-pointer hover:bg-accent"
                                key={e}
                            >
                                {e}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </Cell>
    );
}
