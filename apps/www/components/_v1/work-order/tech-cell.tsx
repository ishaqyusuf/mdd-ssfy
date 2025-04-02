"use client";

import { useState, useTransition } from "react";
import { revalidatePath } from "next/cache";
import { useRouter } from "next/navigation";
import { updateProjectMeta } from "@/app/(v1)/_actions/community/projects";
import { assignTech } from "@/app/(v1)/_actions/customer-services/assign-tech";
import { updateWorkOrderStatus } from "@/app/(v1)/_actions/customer-services/update-status";
import { WorkOrders } from "@/db";
import { useAppSelector } from "@/store";
import { IProject } from "@/types/community";
import { IWorkOrder } from "@/types/customer-service";
import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Input } from "@gnd/ui/input";

import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from "../../ui/command";
import { Label } from "../../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import Btn from "../btn";
import { Cell, StatusCell } from "../columns/base-columns";
import Money from "../money";

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
