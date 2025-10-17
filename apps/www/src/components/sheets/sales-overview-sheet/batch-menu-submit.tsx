import { useMemo, useState } from "react";
import { redirect } from "next/navigation";

import {
    createAssignmentSchema,
    createSubmissionSchema,
} from "@/actions/schema";

import { Menu } from "@/components/(clean-code)/menu";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesControlAction } from "@/hooks/use-sales-control-action";

import { generateRandomString, sum } from "@/lib/utils";
import { CheckCircle, TimerOff } from "lucide-react";
import { useSession } from "next-auth/react";

import z from "zod";

import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import {
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@gnd/ui/dropdown-menu";
import { Label } from "@gnd/ui/label";

import { useProduction } from "./context";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { UpdateSalesControl } from "@sales/schema";
import { useAuth } from "@/hooks/use-auth";

interface Props {
    itemIds?: string[];
    setOpened?;
}
type SubmitSchema = z.infer<typeof createSubmissionSchema>;
export function BatchMenuSubmit({ itemIds, setOpened }: Props) {
    const [dueDate, setDueDate] = useState(null);
    const prod = useProduction();
    const { items, total, pendingAssignments, pendingSubmissions } =
        useMemo(() => {
            const _items = prod.data?.items
                ?.filter((item) =>
                    !itemIds ? true : itemIds?.includes(item.controlUid),
                )
                ?.map((item) => {
                    return {
                        uid: item.controlUid,
                        createAssignmentMeta: {
                            qty: item.analytics.assignment.pending,
                        } as z.infer<typeof createAssignmentSchema>,
                        submitAssignments: item.analytics.pendingSubmissions,
                    };
                })
                .filter(
                    (a) =>
                        a.createAssignmentMeta?.qty?.qty ||
                        a.submitAssignments?.length,
                );
            const pendingSubmissions = sum(
                _items.map((a) =>
                    sum(a.submitAssignments.map((b) => b.qty.qty)),
                ),
            );
            const pendingAssignments = sum(
                _items.map((a) => a.createAssignmentMeta?.qty?.qty),
            );

            return {
                items: _items,
                pendingAssignments,
                pendingSubmissions,
                total: sum([pendingAssignments, pendingSubmissions]),
            };
        }, [prod.data, itemIds]);

    const { form, ...actionControl } = useSalesControlAction({
        onFinish() {
            setOpened(false);
        },
    });
    type SubmitProps = {
        assignedToId?;
    };
    const queryCtx = useSalesOverviewQuery();
    const tsk = useTaskTrigger({
        // silent: true,
        onSucces() {
            queryCtx.salesQuery.assignmentSubmissionUpdated();
        },
    });
    const auth = useAuth();
    async function submit({ assignedToId }: SubmitProps) {
        tsk.triggerWithAuth("update-sales-control", {
            meta: {
                authorId: auth.id,
                salesId: prod.data.orderId,
                authorName: auth.name,
            },
            submitAll: {
                assignedToId,
                itemUids: items.map((a) => a.uid),
            },
        } as UpdateSalesControl);
    }
    return (
        <Menu.Item
            shortCut={`QTY: ${total}`}
            disabled={!total}
            Icon={CheckCircle}
            onClick={
                !pendingAssignments
                    ? (e) => {
                          e.preventDefault();
                          submit({});
                      }
                    : undefined
            }
            SubMenu={
                !pendingAssignments ? undefined : (
                    <>
                        <DropdownMenuLabel>
                            {pendingAssignments} {" unasssigned found"}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {prod?.users?.map((user) => (
                            <Menu.Item
                                shortCut={`${user.pendingProductionQty} pending`}
                                icon="production"
                                key={user.id}
                                className="w-[250px]"
                                SubMenu={
                                    <div className="">
                                        <DropdownMenuLabel>
                                            Due Date
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <Menu.Item
                                            onClick={(e) => {
                                                e.preventDefault();
                                                submit({});
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
                                                disabled={
                                                    actionControl.executing
                                                }
                                                onClick={() =>
                                                    submit({
                                                        assignedToId: user.id,
                                                    })
                                                }
                                                className="w-full"
                                            >
                                                Proceed
                                            </Button>
                                        </div>
                                    </div>
                                }
                            >
                                {user.name}
                            </Menu.Item>
                        ))}
                    </>
                )
            }
        >
            Submit All
        </Menu.Item>
    );
}
