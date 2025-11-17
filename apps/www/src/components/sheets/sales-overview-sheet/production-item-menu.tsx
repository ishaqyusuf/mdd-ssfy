import { useMemo, useState } from "react";
import { CheckCircle, MoreVertical, TimerOff, UserPlus } from "lucide-react";

import { Button } from "@gnd/ui/button";

import { BatchMenuAssignAll } from "./batch-menu-assign-all";
import { BatchMenuDeleteAssignments } from "./batch-menu-delete-assignments";
import { BatchMenuDeleteSubmissions } from "./batch-menu-delete-submissions";
import { BatchMenuSubmit } from "./batch-menu-submit";
import { useProduction } from "./context";
import { useProductionItem } from "./production-tab";
import { DropdownMenu, Tabs } from "@gnd/ui/composite";
import { Menu } from "@/components/(clean-code)/menu";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { sum } from "@gnd/utils";
import { createAssignmentSchema } from "@/actions/schema";
import z from "zod";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { Calendar } from "@gnd/ui/calendar";
import { useAuth } from "@/hooks/use-auth";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { UpdateSalesControl } from "@sales/schema";
export function ProductionItemMenu({}) {
    const ctx = useProductionItem();
    const { queryCtx, item } = ctx;
    const prod = useProduction();
    const [opened, setOpened] = useState(false);

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
        deleteSubmit: { qty: deleteSubmitQty },
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
            const _items = filtered?.map((item) => ({
                uid: item.controlUid,
                assignmentIds: item.analytics.assignment.ids,
                itemId: item.itemId,
                qty: item.analytics.stats?.prodCompleted?.qty,
                deliveredQty: item.analytics.deliveredQty,
            }));
            return {
                qty: sum(_items, "qty"),
                items: _items,
            };
        })();
        return {
            assign,
            submit,
            deleteSubmit,
        };
    }, [prod.data, itemIds]);
    const tsk = useTaskTrigger({
        // silent: true,
        onSucces() {
            setOpened(false);
            queryCtx.salesQuery.assignmentSubmissionUpdated();
        },
    });
    const auth = useAuth();
    const submitAction = async () => {
        switch (action) {
            case "submit":
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
                break;
            case "assign":
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
                break;
            case "delete.submit":
                break;
        }
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
                            setAction("delete.submit");
                        }}
                        // disabled={!deleteSubmitQty}
                        disabled
                        shortCut={`QTY: ${deleteSubmitQty}`}
                    >
                        Delete Submissions
                    </Menu.Item>
                </Tabs.Content>
                <Tabs.Content value="users">
                    <div className="flex gap-4 items-center">
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
                    <div className="flex gap-4 items-center">
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
                        mode="single"
                        // toDate={new Date()}
                        selected={dueDate}
                        onSelect={(value) => {
                            setDueDate(value);
                        }}
                    />
                    <Menu.Item
                        onClick={(e) => {
                            e.preventDefault();
                            submitAction();
                        }}
                        Icon={TimerOff}
                    >
                        No Due Date
                    </Menu.Item>
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
            {/* <BatchMenuAssignAll setOpened={setOpened} itemIds={itemUids} />
            <BatchMenuSubmit setOpened={setOpened} itemIds={itemUids} />
            <BatchMenuDeleteSubmissions
                setOpened={setOpened}
                itemIds={itemUids}
            />
            <BatchMenuDeleteAssignments
                setOpened={setOpened}
                itemIds={itemUids}
            /> */}
        </>
    );
}
