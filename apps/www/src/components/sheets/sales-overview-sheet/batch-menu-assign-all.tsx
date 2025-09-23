import { useMemo, useState } from "react";
import { createAssignmentSchema } from "@/actions/schema";
import { Menu } from "@/components/(clean-code)/menu";

import { generateRandomString, sum } from "@/lib/utils";
import { TimerOff, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import z from "zod";

import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import {
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@gnd/ui/dropdown-menu";

import { useProduction } from "./context";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { UpdateSalesControl } from "@sales/schema";
import { useAuth } from "@/hooks/use-auth";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

interface Props {
    itemIds?: string[];
    setOpened?;
}
export function BatchMenuAssignAll({ itemIds, setOpened }: Props) {
    const [dueDate, setDueDate] = useState(null);
    const prod = useProduction();
    const queryCtx = useSalesOverviewQuery();
    const { pendingQty, items } = useMemo(() => {
        const _items = prod.data?.items
            ?.filter((item) =>
                !itemIds ? true : itemIds?.includes(item.controlUid),
            )
            ?.map((item) => ({
                uid: item.controlUid,
                meta: {
                    qty: item.analytics.assignment.pending,
                    pending: item.analytics.assignment.pending,
                    itemUid: item.controlUid,
                    itemsTotal: item.qty.qty,
                    shelfItemId: item.shelfId,
                    salesId: item.salesId,
                    salesDoorId: item.doorId,
                    salesItemId: item.itemId,
                    unitLabor: item.unitLabor,
                } as z.infer<typeof createAssignmentSchema>,
            }))
            .filter((a) => a.meta.qty?.qty > 0);
        const pendingQty = sum(_items?.map((a) => a.meta.qty.qty));
        return {
            pendingQty,
            items: _items,
        };
    }, [prod.data, itemIds]);

    const tsk = useTaskTrigger({
        // silent: true,
        onSucces() {
            queryCtx.salesQuery.assignmentSubmissionUpdated();
        },
    });

    const auth = useAuth();
    async function assignTo(assignedToId = null) {
        tsk.triggerWithAuth("update-sales-control", {
            meta: {
                authorId: auth.id,
                salesId: prod.data.orderId,
                authorName: auth.name,
            },
            createAssignments: {
                assignedToId,
                dueDate,
                selections: items?.map((i) => ({
                    uid: i.uid,
                    qty: i.meta.qty,
                })),
            },
        } as UpdateSalesControl);
    }
    return (
        <Menu.Item
            Icon={UserPlus}
            className="max-h-none overflow-hidden"
            SubMenu={
                !pendingQty ? undefined : (
                    <>
                        {prod?.users?.map((user) => (
                            <Menu.Item
                                shortCut={`${user.pendingProductionQty} pending`}
                                icon="production"
                                key={user.id}
                                SubMenu={
                                    <>
                                        <DropdownMenuLabel>
                                            Due Date
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <Menu.Item
                                            onClick={(e) => {
                                                e.preventDefault();
                                                assignTo();
                                            }}
                                            Icon={TimerOff}
                                        >
                                            No Due Date
                                        </Menu.Item>
                                        <Calendar
                                            mode="single"
                                            initialFocus
                                            // toDate={new Date()}
                                            selected={dueDate}
                                            onSelect={(value) => {
                                                setDueDate(value);
                                            }}
                                        />
                                        <div className="">
                                            <Button
                                                onClick={() =>
                                                    assignTo(user.id)
                                                }
                                                className="w-full"
                                            >
                                                Proceed
                                            </Button>
                                        </div>
                                    </>
                                }
                            >
                                {user.name}
                            </Menu.Item>
                        ))}
                    </>
                )
            }
            disabled={!pendingQty}
            shortCut={`QTY: ${pendingQty}`}
        >
            Assign All
        </Menu.Item>
    );
}
