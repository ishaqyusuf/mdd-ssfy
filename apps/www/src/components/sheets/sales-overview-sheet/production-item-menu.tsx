import { useMemo, useState } from "react";
import { CheckCircle, MoreVertical, TimerOff, UserPlus } from "lucide-react";

import { Button } from "@gnd/ui/button";
import { useProduction } from "./context";
import { useProductionItem } from "./production-tab";
import { DropdownMenu, Tabs } from "@gnd/ui/composite";
import { Menu } from "@/components/(clean-code)/menu";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { sum, timeout } from "@gnd/utils";
import { createAssignmentSchema } from "@/actions/schema";
import z from "zod";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { Calendar } from "@gnd/ui/calendar";
import { useAuth } from "@/hooks/use-auth";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { UpdateSalesControl } from "@sales/schema";
import { Separator } from "@gnd/ui/separator";
import { deleteSalesAssignmentAction } from "@/actions/delete-sales-assignment";
import { useAction } from "next-safe-action/hooks";
import { toast } from "@gnd/ui/use-toast";
export function ProductionItemMenu({}) {
    const ctx = useProductionItem();
    const { queryCtx, item } = ctx;
    const prod = useProduction();
    const [opened, setOpened] = useState(false);
    return (
        <Menu
            Trigger={
                <Button
                    disabled={queryCtx.dispatchMode}
                    variant="ghost"
                    size="icon"
                >
                    <MoreVertical className="h-4 w-4" />
                </Button>
            }
        >
            <ProductionItemMenuActions
                itemUids={[item.controlUid]}
                setOpened={setOpened}
            />
        </Menu>
    );
    return (
        <DropdownMenu.Root open={opened} onOpenChange={setOpened}>
            <DropdownMenu.Trigger asChild>
                <Button
                    disabled={queryCtx.dispatchMode}
                    variant="ghost"
                    size="icon"
                >
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
                <ProductionItemMenuActions
                    itemUids={[item.controlUid]}
                    setOpened={setOpened}
                />
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}
export function ProductionItemMenuActions({ itemUids = null, setOpened }) {
    const itemIds = itemUids;
    const [tab, setTab] = useState("main");
    const [action, setAction] = useState<
        "assign" | "submit" | "delete.submit" | "delete.assign"
    >();
    const [dueDate, setDueDate] = useState(new Date());
    const [assignedToId, setAssignTo] = useState(null);
    const prod = useProduction();
    const queryCtx = useSalesOverviewQuery();

    const {
        assign: { pendingQty, items },
        submit: {
            items: submitItems,
            total: submitTotal,
            pendingAssignments: submitPendingAssignments,
        },
        deleteSubmit: { qty: deleteSubmitQty, items: deleteSubmitItems },
        deleteAssignment: {
            qty: deleteAssignmentQty,
            items: deleteAssignmentItems,
        },
    } = useMemo(() => {
        const filtered = prod.data?.items?.filter((item) =>
            !itemIds ? true : itemIds?.includes(item.controlUid)
        );
        const _items = filtered
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
        const assign = {
            pendingQty,
            items: _items,
        };
        const submit = (() => {
            const _items = filtered
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
                        a.submitAssignments?.length
                );
            const pendingSubmissions = sum(
                _items.map((a) =>
                    sum(a.submitAssignments.map((b) => b.qty.qty))
                )
            );
            const pendingAssignments = sum(
                _items.map((a) => a.createAssignmentMeta?.qty?.qty)
            );

            return {
                items: _items,
                pendingAssignments,
                pendingSubmissions,
                total: sum([pendingAssignments, pendingSubmissions]),
            };
        })();
        const deleteSubmit = (() => {
            const _items = filtered?.map((item) => {
                return {
                    uid: item.controlUid,
                    assignmentIds: item.analytics.assignment.ids,
                    itemId: item.itemId,
                    qty: item.analytics.stats?.prodCompleted?.qty,
                    deliveredQty: item.analytics.deliveredQty,
                };
            });
            return {
                qty: sum(_items, "qty"),
                items: _items,
            };
        })();
        const deleteAssignment = (() => {
            const _items = filtered?.map((item) => {
                const stats = item.analytics.stats;
                return {
                    uid: item.controlUid,
                    assignmentIds: item.analytics.assignment.ids,
                    itemId: item.itemId,
                    qty: stats?.prodAssigned?.qty,
                    deliveredQty: item.analytics.deliveredQty,
                    submitQty: item.analytics.submitQty,
                };
            });
            return {
                qty: sum(_items, "qty"),
                items: _items,
            };
        })();
        return {
            assign,
            submit,
            deleteSubmit,
            deleteAssignment,
        };
    }, [prod.data, itemIds]);
    const onSuccess = () => {
        setOpened(false);
        queryCtx.salesQuery.assignmentSubmissionUpdated();
    };
    const tsk = useTaskTrigger({
        // silent: true,
        onSucces: onSuccess,
    });

    const auth = useAuth();
    const deleteAssignments = useAction(deleteSalesAssignmentAction, {
        onSuccess,
        onError(e) {},
    });
    const triggerAction = async (a: typeof action) => {
        setAction(a);
        submitAction(a);
    };
    const submitAction = async (_action?: typeof action) => {
        if (!_action) _action = action;
        const payload = () => {
            const pl = {
                meta: {
                    authorId: auth.id,
                    salesId: prod.data.orderId,
                    authorName: auth.name,
                },
            } as UpdateSalesControl;

            switch (_action) {
                case "submit":
                    pl.submitAll = {
                        assignedToId,
                        itemUids: items.map((a) => a.uid),
                    };
                    break;
                case "assign":
                    pl.createAssignments = {
                        retries: 0,
                        assignedToId,
                        dueDate,
                        selections: items?.map((i) => ({
                            uid: i.uid,
                            qty: i.meta.qty,
                        })),
                    };
                    break;
                case "delete.assign":
                    const deliveredQty = sum(
                        deleteAssignmentItems,
                        "deliveredQty"
                    );
                    const submitQty = sum(deleteAssignmentItems, "submitQty");
                    if (deliveredQty) {
                        toast({
                            title: "Unable to complete",
                            description:
                                "Some assignments have been submitted and registered to dispatch.",
                        });

                        throw new Error();
                    }
                    if (submitQty) {
                        toast({
                            title: "Unable to complete",
                            description:
                                "Some assignments have been submitted.",
                        });
                        throw new Error();
                    }
                    pl.deleteAssignments = {
                        itemIds: deleteAssignmentItems.map((a) => a.itemId),
                    };
                    break;
                case "delete.submit":
                    const _deliveredQty = sum(
                        deleteSubmitItems,
                        "deliveredQty"
                    );
                    if (_deliveredQty) {
                        toast({
                            title: "Unable to complete",
                            description:
                                "Some submissions have been registered to dispatch.",
                        });
                        throw new Error();
                    }
                    pl.deleteSubmissions = {
                        itemIds: deleteSubmitItems.map((a) => a.itemId),
                    };
                    break;
            }
            return pl;
        };
        try {
            const pl = payload();
            console.log(pl);
            tsk.triggerWithAuth("update-sales-control", pl);
        } catch (error) {}
    };
    return (
        <>
            <Tabs.Root value={tab}>
                <Tabs.Content value="main">
                    <Menu.Item
                        onClick={(e) => {
                            e.preventDefault();
                            setAction("assign");
                            setTab("users");
                        }}
                        Icon={UserPlus}
                        disabled={!pendingQty}
                        shortCut={`QTY: ${pendingQty}`}
                        className="max-h-none overflow-hidden"
                    >
                        Assign All
                    </Menu.Item>
                    <Menu.Item
                        shortCut={`QTY: ${submitTotal}`}
                        disabled={!submitTotal}
                        Icon={CheckCircle}
                        onClick={(e) => {
                            e.preventDefault();
                            setAction("submit");
                            setTimeout(() => {
                                if (!submitPendingAssignments) {
                                    submitAction();
                                } else {
                                    setTab("users");
                                }
                            }, 500);
                        }}
                    >
                        Submit All
                    </Menu.Item>
                    <Menu.Item
                        Icon={Icons.Delete}
                        onClick={(e) => {
                            e.preventDefault();
                            triggerAction("delete.submit");
                        }}
                        disabled={!deleteSubmitQty}
                        // disabled
                        shortCut={`QTY: ${deleteSubmitQty}`}
                    >
                        Delete Submissions
                    </Menu.Item>
                    <Menu.Item
                        Icon={Icons.Delete}
                        onClick={(e) => {
                            e.preventDefault();
                            triggerAction("delete.assign");
                        }}
                        disabled={!deleteAssignmentQty}
                        shortCut={`QTY: ${deleteAssignmentQty}`}
                    >
                        Delete Assignments
                    </Menu.Item>
                </Tabs.Content>
                <Tabs.Content value="users">
                    <div className="flex gap-2 px-2 items-center">
                        <Button
                            size="xs"
                            onClick={(e) => {
                                setTab("main");
                            }}
                            className="rounded-full size-6 p-0"
                        >
                            <Icons.ChevronLeft className="size-3" />
                        </Button>
                        <Label>Select Production Worker</Label>
                    </div>
                    <DropdownMenu.Separator />
                    {prod?.users?.map((user) => (
                        <Menu.Item
                            onClick={(e) => {
                                e.preventDefault();
                                setTab("due-date");
                                setAssignTo(user.id);
                            }}
                            shortCut={`${user.pendingProductionQty} pending`}
                            icon="production"
                            key={user.id}
                            className="min-w-[250px] whitespace-nowrap"
                        >
                            {user.name}
                        </Menu.Item>
                    ))}
                </Tabs.Content>
                <Tabs.Content value="due-date">
                    <div className="flex gap-4 px-4 items-center">
                        <Button
                            size="xs"
                            onClick={(e) => {
                                setTab("users");
                            }}
                            className="rounded-full size-6 p-0"
                        >
                            <Icons.ChevronLeft className="size-3" />
                        </Button>
                        <DropdownMenu.Label>Due Date</DropdownMenu.Label>
                    </div>
                    <DropdownMenu.Separator />
                    <Calendar
                        className="w-[250px]"
                        mode="single"
                        // toDate={new Date()}
                        selected={dueDate}
                        onSelect={(value) => {
                            setDueDate(value);
                        }}
                    />
                    <Button
                        variant="outline"
                        onClick={() => {
                            setDueDate(null);
                        }}
                        className="w-full"
                    >
                        <TimerOff className="size-4 mr-4" />
                        No Due Date
                    </Button>
                    <Separator />
                    <div className="">
                        <Button
                            onClick={() => {
                                submitAction();
                            }}
                            className="w-full"
                        >
                            Proceed
                        </Button>
                    </div>
                </Tabs.Content>
            </Tabs.Root>
        </>
    );
}
