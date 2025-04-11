"use server";

import {
    doorItemControlUid,
    itemItemControlUid,
    mouldingItemControlUid,
} from "@/app/(clean-code)/(sales)/_common/utils/item-control-utils";
import { composeStepFormDisplay } from "@/app/(clean-code)/(sales)/_common/utils/sales-step-utils";
import {
    QtyControlType,
    SalesItemMeta,
    SalesType,
} from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { composeQtyMatrix, Qty } from "@/utils/sales-control-util";
import { Prisma } from "@prisma/client";

export async function getSalesProductionOverviewAction(salesId, assignedToId?) {
    let _select = select;
    if (assignedToId) _select.assignments.where.assignedToId = assignedToId;
    const order = await prisma.salesOrders.findFirstOrThrow({
        where: {
            id: salesId,
            type: "order" as SalesType,
        },
        select: _select,
    });
    let items: Item[] = [];
    function addItem(item: Item) {
        item.subtitle = [item.sectionTitle, item.size, item.swing]
            ?.filter(Boolean)
            .join(" | ");
        const assignments = order.assignments.filter((a) =>
            a.itemId == item.itemId && item.doorId
                ? item.doorId == a.salesDoorId
                : undefined,
        );

        items.push(item);
    }
    order.items.map((item) => {
        const itemIndex = (item.meta as any as SalesItemMeta)?.lineIndex;
        const hpt = item.housePackageTool;
        const doors = hpt?.doors;
        let controlUid;
        let { configs, sectionTitle } = composeStepFormDisplay(
            item.formSteps,
            item.dykeDescription,
        );
        if (!order.isDyke || (!doors?.length && !hpt?.door)) {
            controlUid = hpt
                ? mouldingItemControlUid(item.id, hpt.id)
                : itemItemControlUid(item.id);
            let title = item.description;
            let hidden = !order.isDyke && (title?.includes("***") || !item.qty);
            if (hidden) sectionTitle = title?.replaceAll("*", "");
            addItem({
                controlUid,
                sectionTitle,
                itemIndex,
                title: title?.replaceAll("*", ""),
                itemId: item.id,
                unitCost: item.rate,
                totalCost: item.total,
                noHandle: false,
            });
        }
        if (doors?.length) {
            doors.map((door) => {
                const title = `${
                    door?.stepProduct?.door?.title ||
                    door?.stepProduct?.product?.title ||
                    door.stepProduct?.name
                }`;
                controlUid = doorItemControlUid(door.id, door.dimension);
                const qty = composeQtyMatrix(
                    door.rhQty,
                    door.lhQty,
                    door.totalQty,
                );
                addItem({
                    controlUid,
                    sectionTitle,
                    doorId: door.id,
                    itemIndex,
                    title,
                    itemId: item.id,
                    unitCost: door.unitPrice,
                    totalCost: door.lineTotal,
                    swing: door.swing,
                    qty: qty,
                    noHandle: qty.noHandle,
                });
            });
        }
    });
    items = items
        .sort((a, b) => a.itemIndex - b.itemIndex)
        .map((item, index) => {
            const control = order.itemControls.find(
                (c) => c.uid == item.controlUid,
            );
            item.produceable = control?.produceable;
            item.shippable = control?.shippable;
            return item;
        });
    return {
        items,
    };
}
interface Item {
    title: string;
    produceable?: boolean;
    shippable?: boolean;
    subtitle?: string;
    swing?: string;
    size?: string;
    sectionTitle?: string;
    controlUid: string;
    itemIndex?: number;
    itemId?: number;
    doorId?: number;
    primary?: boolean;
    qty?: Qty;
    assigned?: Qty;
    produced?: Qty;
    delivered?: Qty;
    unitCost?: number;
    totalCost?: number;
    noHandle: boolean;
}
const select = {
    meta: true,
    orderId: true,
    isDyke: true,
    assignments: {
        where: {
            assignedToId: undefined, // !producerId ? undefined : producerId,
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
                            rhQty: true,
                            lhQty: true,
                            totalQty: true,
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
} satisfies Prisma.SalesOrdersSelect;
