"use server";

import { loadSalesSetting } from "@/actions/sales-settings";
import {
    doorItemControlUid,
    itemItemControlUid,
    mouldingItemControlUid,
} from "@/app/(clean-code)/(sales)/_common/utils/item-control-utils";
import { composeStepFormDisplay } from "@/app/(clean-code)/(sales)/_common/utils/sales-step-utils";
import {
    DykeSalesDoorMeta,
    QtyControlType,
    SalesItemMeta,
    SalesMeta,
    SalesType,
} from "@/app/(clean-code)/(sales)/types";
import { prisma, Prisma } from "@/db";
import { formatCurrency } from "@/lib/use-number";
import {
    composeQtyMatrix,
    composeSalesItemControlStat,
    Qty,
} from "@/utils/sales-control-util";
import { getItemStatConfig } from "@/utils/sales-utils";

export async function getSalesItemsOverviewAction(orderId, assignedToId?) {
    let _select = select;
    if (assignedToId) _select.assignments.where.assignedToId = assignedToId;
    const order = await prisma.salesOrders.findFirstOrThrow({
        where: {
            orderId,
            type: "order" as SalesType,
        },
        select: _select,
    });
    const meta = order.meta as any as SalesMeta;
    const setting = await loadSalesSetting();
    let items: ItemControlData[] = [];
    order.items.map((item) => {
        const { multiDyke, multiDykeUid } = item;

        let baseItem =
            !multiDyke && multiDykeUid
                ? order.items.find(
                      (a) => a.multiDyke && multiDykeUid == a.multiDykeUid,
                  ) || item
                : item;
        function addItem(item: ItemControlData) {
            item.salesId = order.id;
            item.itemConfig = getItemStatConfig({
                isDyke: order.isDyke,
                formSteps: baseItem.formSteps,
                setting: setting.data,
                qty: baseItem.qty,
                dykeProduction: baseItem.dykeProduction,
                swing: baseItem.swing,
                prodOverride: item.prodOverride,
            });
            item.analytics = composeSalesItemControlStat(
                item,
                // item.controlUid,
                // item.qty,
                order,
                // item.itemConfig,
            );
            const hands = assignedToId
                ? item.analytics.stats?.prodAssigned
                : item.analytics?.stats?.qty;
            let handTitle = "";
            if (hands?.qty) {
                if (hands?.lh || hands.rh)
                    handTitle = [
                        hands?.lh ? `${hands?.lh} LH` : null,
                        hands?.rh ? `${hands?.rh} RH` : null,
                    ]
                        ?.filter(Boolean)
                        ?.join(" & ");
                else handTitle = `QTY: ${hands.qty}`;
            }
            item.subtitle = [
                item.sectionTitle,
                item.size,
                item.swing,
                handTitle,
                assignedToId
                    ? null
                    : item.unitLabor
                      ? `$ ${formatCurrency(item.unitLabor)}/qty labor`
                      : `no labor cost`,
            ]
                ?.filter(Boolean)
                .join(" | ");
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
                const doorMeta = door.meta as DykeSalesDoorMeta;
                const unitLabor =
                    doorMeta?.unitLabor || meta?.laborConfig?.rate;
                addItem({
                    unitLabor,
                    controlUid,
                    sectionTitle,
                    doorId: door.id,
                    hptId: hpt.id,
                    dim: door.dimension,
                    size: door.dimension,
                    itemIndex,
                    title,
                    itemId: item.id,
                    unitCost: door.unitPrice,
                    totalCost: door.lineTotal,
                    swing: door.swing,
                    qty: qty,
                    noHandle: qty.noHandle,
                    configs,
                    prodOverride: doorMeta?.prodOverride,
                });
            });
        }
    });
    items = items.sort((a, b) => a.itemIndex - b.itemIndex);
    // order.deliveries.
    await Promise.all(
        items.map(async (item) => {
            if (item.analytics?.assignmentUidUpdates?.length)
                await prisma.orderItemProductionAssignments.updateMany({
                    where: {
                        id: {
                            in: item.analytics.assignmentUidUpdates,
                        },
                    },
                    data: {
                        salesItemControlUid: item.controlUid,
                    },
                });
        }),
    );
    return {
        items,
        orderNo: orderId,
        orderId: order.id,
        deliveries: order.deliveries,
        order,
        orderMeta: order.meta as any as SalesMeta,
        // order
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
    unitLabor?: number;
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
    prodOverride?: DykeSalesDoorMeta["prodOverride"];
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
            deliveryMode: true,
            id: true,
            createdBy: {
                select: {
                    name: true,
                },
            },
            driver: {
                select: {
                    name: true,
                    id: true,
                },
            },
            createdAt: true,
            dueDate: true,
            items: {
                where: {
                    deletedAt: null,
                },
                select: {
                    id: true,
                    qty: true,
                    lhQty: true,
                    rhQty: true,
                    orderProductionSubmissionId: true,
                    status: true,
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
            multiDykeUid: true,
            multiDyke: true,
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
                            meta: true,
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
