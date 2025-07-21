"use server";

import { authId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { formatMoney } from "@/lib/use-number";
import { sum } from "@/lib/utils";
import { AsyncFnType } from "@/types";

import {
    QtyControlByType,
    QtyControlType,
    SalesItemMeta,
    SalesMeta,
} from "../../types";
import {
    doorItemControlUid,
    itemItemControlUid,
    mouldingItemControlUid,
} from "../utils/item-control-utils";
import { composeStepFormDisplay } from "../utils/sales-step-utils";

export type GetSalesItemOverviewAction = AsyncFnType<
    typeof getSalesItemsOverviewAction
>;
interface GetSalesItemOverviewActionProps {
    salesId;
    producerId?;
    adminMode?: boolean;
    dispatchId?;
}
export async function getSalesItemsOverviewAction({
    salesId,
    producerId,
    adminMode,
}: GetSalesItemOverviewActionProps) {
    if (!adminMode) producerId = await authId();
    if (!salesId) throw new Error("Id is required");
    const order = await prisma.salesOrders.findFirstOrThrow({
        where: { id: salesId },
        select: {
            meta: true,
            orderId: true,
            isDyke: true,
            assignments: {
                where: {
                    assignedToId: !producerId ? undefined : producerId,
                    deletedAt: null,
                },
                select: {
                    id: true,
                    itemId: true,
                    dueDate: true,
                    lhQty: true,
                    rhQty: true,
                    salesDoorId: true,
                    qtyAssigned: true,
                    createdAt: true,
                    assignedTo: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    submissions: {
                        where: {
                            deletedAt: null,
                        },
                        select: {
                            id: true,
                            createdAt: true,
                            note: true,
                            qty: true,
                            rhQty: true,
                            lhQty: true,
                        },
                    },
                },
            },
            items: {
                where: {
                    deletedAt: null,
                },
                select: {
                    description: true,
                    dykeDescription: true,
                    qty: true,
                    id: true,
                    meta: true,
                    total: true,
                    swing: true,
                    rate: true,
                    formSteps: {
                        where: {
                            deletedAt: null,
                        },
                        select: {
                            value: true,
                            step: {
                                select: {
                                    title: true,
                                },
                            },
                        },
                    },
                    housePackageTool: {
                        where: {
                            deletedAt: null,
                        },
                        select: {
                            id: true,
                            stepProduct: {
                                where: {
                                    deletedAt: null,
                                },
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                            door: {
                                select: {
                                    id: true,
                                    title: true,
                                },
                            },
                            doors: {
                                where: {
                                    deletedAt: null,
                                },
                                select: {
                                    id: true,
                                    dimension: true,
                                    swing: true,
                                    lineTotal: true,
                                    unitPrice: true,
                                    stepProduct: {
                                        select: {
                                            name: true,
                                            door: {
                                                select: {
                                                    title: true,
                                                },
                                            },
                                            product: {
                                                select: {
                                                    id: true,
                                                    title: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            itemControls: {
                where: {
                    deletedAt: null,
                },
                select: {
                    shippable: true,
                    produceable: true,
                    sectionTitle: true,
                    title: true,
                    uid: true,
                    qtyControls: {
                        where: {
                            deletedAt: null,
                            type: {
                                in: [
                                    "dispatchCompleted",
                                    "prodAssigned",
                                    "prodCompleted",
                                    "qty",
                                    "dispatchAssigned",
                                    "dispatchInProgress",
                                ] as QtyControlType[],
                            },
                        },
                    },
                },
            },
        },
    });

    let items: {
        title;
        swing;
        itemIndex;
        totalCost?;
        subtitle?;
        inlineSubtitle?: string;
        unitCost?;
        status: Partial<QtyControlByType>;
        produceable?: boolean;
        shippable?: boolean;
        itemControlUid;
        itemConfigs?: { label; value; color? }[];
        sectionTitle;
        primary?: boolean;
        hidden?: boolean;
        lineConfigs?: string[];
        itemId;
        doorId?;
        assignments: ReturnType<typeof transformAssignments>;
    }[] = [];
    function addItem(item: (typeof items)[number]) {
        item.inlineSubtitle = [item.sectionTitle, item.subtitle, item.swing]
            ?.filter(Boolean)
            .join(" | ");
        items.push(item);
    }
    function transformAssignments(assignments: (typeof order)["assignments"]) {
        return assignments.map((ass) => {
            const resp = {
                id: ass.id,
                assignedTo: ass.assignedTo?.name,
                assignedToId: ass.assignedTo?.id,
                dueDate: ass.dueDate,
                lh: ass.lhQty,
                rh: ass.rhQty,
                qty: !ass.lhQty && !ass.rhQty ? ass.qtyAssigned : null,
                total: ass.qtyAssigned,
                pills: [],
                submissions: ass.submissions.map((s) => {
                    const resp = {
                        lh: s.lhQty,
                        rh: s.rhQty,
                        qty: !s.lhQty && !s.rhQty ? s.qty : 0,
                        total: 0,
                        id: s.id,
                        date: s.createdAt,
                        description: ``,
                    };
                    if (resp.qty) resp.description = `${resp.qty} items(s)`;
                    else {
                        resp.description = ["lh", "rh"]
                            .map((a) => ({
                                qty: resp[a],
                                text: `${resp[a]} ${a}`?.toUpperCase(),
                            }))
                            .filter((a) => a.qty)
                            .map((a) => a.text)
                            .join(" & ");
                    }
                    resp.total = sum([resp.lh, resp.rh, resp.qty]);
                    return resp;
                }),
                pendingSubmission: {
                    lh: 0,
                    rh: 0,
                    qty: 0,
                },
            };

            resp.pills = ["rh", "lh", "qty"]
                .map((q) => {
                    const assigned = resp[q];
                    if (!assigned) return null;
                    const submitted = sum(resp.submissions?.map((a) => a[q]));
                    resp.pendingSubmission[q] = assigned - submitted;
                    return {
                        label: `${submitted}/${assigned} ${q}`,
                    };
                })
                .filter(Boolean);
            return resp;
        });
    }
    order.items.map((item) => {
        const itemIndex = (item.meta as any as SalesItemMeta)?.lineIndex;
        let itemControlUid;
        const hpt = item.housePackageTool;
        const doors = hpt?.doors;
        let { configs, sectionTitle } = composeStepFormDisplay(
            item.formSteps,
            item.dykeDescription,
        );

        if (!order.isDyke || (!doors?.length && !hpt?.door)) {
            const assignments = order.assignments.filter(
                (a) => !a.salesDoorId && a.itemId == item.id,
            );
            itemControlUid = hpt
                ? mouldingItemControlUid(item.id, hpt.id)
                : itemItemControlUid(item.id);
            let title = item.description;
            let hidden = !order.isDyke && (title?.includes("***") || !item.qty);
            if (hidden) sectionTitle = title?.replaceAll("*", "");
            addItem({
                itemId: item.id,
                sectionTitle,
                itemConfigs: configs,
                itemIndex,
                itemControlUid,
                status: {},
                swing: item.swing,
                title: title?.replaceAll("*", ""),
                totalCost: item.total,
                unitCost: item.rate,
                hidden,
                primary: hidden,
                assignments: transformAssignments(assignments),
            });
        } else if (doors?.length) {
            doors.map((door) => {
                const assignments = order.assignments.filter(
                    (a) => a.salesDoorId == door.id && a.itemId == item.id,
                );
                const title = `${
                    door?.stepProduct?.door?.title ||
                    door?.stepProduct?.product?.title ||
                    door.stepProduct?.name
                }`;

                itemControlUid = doorItemControlUid(door.id, door.dimension);
                addItem({
                    assignments: transformAssignments(assignments),
                    itemIndex,
                    doorId: door.id,
                    itemId: item.id,
                    sectionTitle,
                    itemControlUid,
                    status: {},
                    title,
                    swing: door.swing,
                    subtitle: door.dimension,
                    totalCost: door.lineTotal,
                    unitCost: door.unitPrice,
                    itemConfigs: configs,
                });
            });
        }
    });
    items = items.sort((a, b) => a.itemIndex - b.itemIndex);
    items = items
        .map((item, index) => {
            if (
                index ==
                items.findIndex(
                    (a) => a.itemIndex >= 0 && item.itemIndex == a.itemConfigs,
                )
            )
                item.primary = true;

            const control = order.itemControls.find(
                (c) => c.uid == item.itemControlUid,
            );
            item.produceable = control?.produceable;
            item.shippable = control?.shippable;
            control?.qtyControls?.map((c) => {
                item.status[c.type] = c;
            });

            item.lineConfigs = [];
            const qty = item.status?.qty;
            item.lineConfigs.push(item.subtitle);
            if (qty?.qty) item.lineConfigs.push(`QTY X ${qty.qty}`);
            if (qty?.lh) item.lineConfigs.push(`${qty.lh} LH`);
            if (qty?.rh) item.lineConfigs.push(`${qty.rh} RH`);
            if (qty?.total > 1 && adminMode)
                item.lineConfigs.push(`$${formatMoney(item.unitCost)} each`);
            item.lineConfigs = item.lineConfigs.filter(Boolean);

            return item;
        })
        .filter((item) => {
            if (!adminMode) {
                item.assignments = item.assignments.filter(
                    (a) => a.assignedToId == producerId,
                );
                return item.assignments.length;
            }
            return true;
        });
    return {
        items,
        meta: order.meta as any as SalesMeta,
    };
}
