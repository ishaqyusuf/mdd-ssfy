"use server";

import { loadSalesSetting } from "@/app/(clean-code)/(sales)/_common/data-access/sales-form-settings.dta";
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
import { prisma, Prisma } from "@/db";
import { sum } from "@/lib/utils";
import {
    composeQtyMatrix,
    composeSalesItemControlStat,
    Qty,
    qtyMatrixDifference,
} from "@/utils/sales-control-util";
import {
    formatControlQty,
    getItemStatConfig,
    qtyControlsByType,
} from "@/utils/sales-utils";

export async function getSalesProductionOverviewAction(orderId, assignedToId?) {
    let _select = select;
    if (assignedToId) _select.assignments.where.assignedToId = assignedToId;
    const order = await prisma.salesOrders.findFirstOrThrow({
        where: {
            orderId,
            type: "order" as SalesType,
        },
        select: _select,
    });

    const setting = await loadSalesSetting();
    let items: ItemControlData[] = [];
    order.items.map((item) => {
        let baseItem = item;
        function addItem(item: ItemControlData) {
            item.salesId = order.id;
            item.itemConfig = getItemStatConfig({
                isDyke: order.isDyke,
                formSteps: baseItem.formSteps,
                setting: setting.data,
                qty: baseItem.qty,
                dykeProduction: baseItem.dykeProduction,
                swing: baseItem.swing,
            });
            item.subtitle = [item.sectionTitle, item.size, item.swing]
                ?.filter(Boolean)
                .join(" | ");
            item.analytics = composeSalesItemControlStat(
                item,
                // item.controlUid,
                // item.qty,
                order,
                // item.itemConfig,
            );
            items.push(item);
        }
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
                ? mouldingItemControlUid(item.id, hpt?.id)
                : itemItemControlUid(item.id);
            let title = item.description;
            let hidden = !order.isDyke && (title?.includes("***") || !item.qty);
            if (hidden) sectionTitle = title?.replaceAll("*", "");
            addItem({
                controlUid,
                qty: {
                    qty: item.qty,
                },
                hptId: hpt?.id,
                sectionTitle,
                itemIndex,
                title: title?.replaceAll("*", ""),
                itemId: item.id,
                unitCost: item.rate,
                totalCost: item.total,
                noHandle: false,
                configs,
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
                    hptId: hpt.id,
                    dim: door.dimension,
                    itemIndex,
                    title,
                    itemId: item.id,
                    unitCost: door.unitPrice,
                    totalCost: door.lineTotal,
                    swing: door.swing,
                    qty: qty,
                    noHandle: qty.noHandle,
                    configs,
                });
            });
        }
    });
    items = items.sort((a, b) => a.itemIndex - b.itemIndex);

    return {
        items,
        orderNo: orderId,
        orderId: order.id,
    };
}
export interface ItemControlData {
    title: string;
    // produceable?: boolean;
    configs?: { color?; label?; value?; hidden }[];
    // shippable?: boolean;
    subtitle?: string;
    swing?: string;
    size?: string;
    sectionTitle?: string;
    controlUid: string;
    itemIndex?: number;
    itemId?: number;
    doorId?: number;
    hptId?: number;
    shelfId?: number;
    dim?: string;
    salesId?: number;
    primary?: boolean;
    qty: Qty;
    // assigned?: Qty;
    // produced?: Qty;
    // pending?: {
    //     assignment?: Qty;
    //     production?: Qty;
    //     delivery?: Qty;
    // };
    // delivered?: Qty;
    unitCost?: number;
    totalCost?: number;
    noHandle: boolean;
    analytics?: ReturnType<typeof composeSalesItemControlStat>;
    itemConfig?: ReturnType<typeof getItemStatConfig>;
}
const select = {
    meta: true,
    orderId: true,
    isDyke: true,
    id: true,

    deliveries: {
        where: {
            deletedAt: null,
        },
        select: {
            status: true,
            items: {
                where: {
                    deletedAt: null,
                },
                select: {
                    qty: true,
                    lhQty: true,
                    rhQty: true,
                    orderProductionSubmissionId: true,
                },
            },
        },
    },
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
            salesItemControlUid: true,
            shelfItemId: true,
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
            shelfItems: {
                select: {
                    id: true,
                },
            },
            description: true,
            dykeDescription: true,
            dykeProduction: true,
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
                    prodUid: true,
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
