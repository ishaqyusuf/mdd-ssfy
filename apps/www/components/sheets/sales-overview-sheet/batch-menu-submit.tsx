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

import { useProduction } from "./production-tab";

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
    const createSubmission = useAction(submitSalesAssignmentAction, {
        onSuccess(args) {
            const auid = `${args.input.assignmentId}_${args.input?.itemUid}`;
            console.log({ auid });
            form.setValue(
                `actions.submissionActions.${auid}.status`,
                "success",
            );

            loader.display({
                title: "Creating Submission",
            });
            setTimeout(() => {
                form.setValue("nextTriggerUID", generateRandomString());
            }, 150);
        },
        onError(e) {
            console.log(e);
        },
    });
    const createAssignment = useAction(createSalesAssignmentAction, {
        onSuccess(args) {
            form.setValue(
                `actions.assignmentActions.${args.input?.itemUid}.assignmentId`,
                args.data?.assignmentId,
            );
            form.setValue(
                `actions.assignmentActions.${args.input?.itemUid}.status`,
                "success",
            );
            form.setValue(
                `actions.submissionActions.${args.data?.assignmentId}_${args.input?.itemUid}`,
                {
                    status: null,
                    meta: {
                        assignmentId: args.data?.assignmentId,
                        qty: args.input.qty,
                        pending: args.input.pending,
                    },
                },
            );
            loader.display({
                title: "Creating Assignment",
                // description: `Created`,
            });
            setTimeout(() => {
                form.setValue("nextTriggerUID", generateRandomString());
            }, 150);
        },
        onError(e) {
            console.log(e);
        },
    });

    const form = useForm<{
        actionIds: string[];
        currentActionId: string;
        nextTriggerUID?: string;
        error?: string;
        actions: {
            assignmentActions: {
                [itemUid in string]: {
                    assignmentId: number;
                    status?: string;
                    uid: string;
                    meta?: any;
                };
            };
            submissionMeta: {
                [itemUid in string]: SubmitSchema;
            };
            submissionActions: {
                [itemUid in string]: {
                    meta: SubmitSchema;
                    status: "success" | "error";
                };
            };
        };
    }>({
        defaultValues: {
            actions: null,
        },
    });
    const queryCtx = useSalesOverviewQuery();
    const [error, currentActionId, actions, nextTriggerUID] = form.watch([
        "error",
        "currentActionId",
        "actions",
        "nextTriggerUID",
    ]);
    useEffect(() => {
        if (!nextTriggerUID) {
            if (actions) {
                loader.success("Submission completed.");
                queryCtx._refreshToken();
                setOpened(false);
            }
            return;
        }
        if (error) {
            loader.error(error);
            queryCtx._refreshToken();
            setOpened(false);
            return;
        }
        const entry = Object.entries(actions.assignmentActions).find(
            ([uid, data]) => !data.assignmentId,
        );
        if (entry) {
            const [uid, itemData] = entry;
            createAssignment.execute({
                ...itemData.meta,
            });
            return;
        }
        const submissionEntry = Object.entries(actions.submissionActions).find(
            ([uid, data]) => !data.status,
        );
        if (!submissionEntry) {
            form.setValue("nextTriggerUID", null);
            return;
        }

        const [uid, itemData] = submissionEntry;

        const [assignmentId, itemUid] = uid?.split("_");
        const submissionMeta = actions.submissionMeta?.[itemUid];

        if (!submissionMeta) {
            form.setValue("error", "Unable to create submission");
            setTimeout(() => {
                form.setValue("nextTriggerUID", generateRandomString());
            }, 100);
        } else {
            createSubmission.execute({
                ...itemData.meta,
                ...submissionMeta,
            });
        }
    }, [nextTriggerUID]);
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
        form.setValue("actions", data);
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
                                                    !!currentActionId ||
                                                    createAssignment.isExecuting ||
                                                    !!actions
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
