import { useEffect, useMemo, useState } from "react";
import { redirect } from "next/navigation";
import { createSalesAssignmentAction } from "@/actions/create-sales-assignment";
import {
    createAssignmentSchema,
    createSubmissionSchema,
} from "@/actions/schema";
import {
    submitSalesAssignment,
    submitSalesAssignmentAction,
} from "@/actions/submit-sales-assignment";
import { Menu } from "@/components/(clean-code)/menu";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesControlAction } from "@/hooks/use-sales-control-action";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { generateRandomString, sum } from "@/lib/utils";
import { CheckCircle, TimerOff, UserPlus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import z from "zod";

import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import {
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@gnd/ui/dropdown-menu";
import { Label } from "@gnd/ui/label";

import { useProduction } from "./context";

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
                        itemId: item.itemId,
                        salesId: item.salesId,
                        uid: item.controlUid,
                        createAssignmentMeta: {
                            qty: item.analytics.assignment.pending,
                            pending: item.analytics.assignment.pending,
                            itemUid: item.controlUid,
                            itemsTotal: item.qty.qty,
                            shelfItemId: item.shelfId,
                            salesId: item.salesId,
                            salesDoorId: item.doorId,
                            salesItemId: item.itemId,
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
    const loader = useLoadingToast();
    const { form, ...actionControl } = useSalesControlAction({
        onFinish() {
            setOpened(false);
        },
    });
    type SubmitProps = {
        assignedToId?;
    };
    const session = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });
    async function submit({ assignedToId }: SubmitProps) {
        const data = {
            assignmentActions: {},
            submissionActions: {},
            submissionMeta: {},
        };
        items?.map((item) => {
            if (item.createAssignmentMeta?.qty?.qty)
                data.assignmentActions[item.uid] = {
                    meta: {
                        ...item.createAssignmentMeta,
                        dueDate,
                        assignedToId,
                        // itemUID: item.uid,
                    } as z.infer<typeof createAssignmentSchema>,
                    uid: item.uid,
                };
            if (!data.submissionMeta[item.uid]) {
                data.submissionMeta[item.uid] = {
                    itemUid: item.uid,
                    itemId: item.itemId,
                    salesId: item.salesId,
                    submittedById: session?.data?.user?.id,
                };
            }
            item.submitAssignments.map((submitData) => {
                data.submissionActions[
                    `${submitData.assignmentId}_${item.uid}`
                ] = {
                    meta: {
                        qty: submitData.qty,
                        pending: submitData.qty,
                        assignmentId: submitData.assignmentId,
                    } as SubmitSchema,
                };
            });
        });
        form.setValue("actions", data as any);
        loader.display({
            title: "Submitting Assignments...",
            duration: Number.POSITIVE_INFINITY,
        });

        setTimeout(() => {
            form.setValue("nextTriggerUID", generateRandomString());
        }, 200);
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
                                SubMenu={
                                    <>
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
                                    </>
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
