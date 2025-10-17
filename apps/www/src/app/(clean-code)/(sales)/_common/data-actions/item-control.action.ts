"use server";

import { Prisma, prisma } from "@/db";
// import { updateSalesStatControlAction } from "./sales-stat-control.action";
import { percent, sum } from "@/lib/utils";
import { AsyncFnType } from "@/types";
import { qtyControlsByType } from "@/utils/sales-utils";

import { QtyControlType, SalesDispatchStatus, StepMeta } from "../../types";
import { loadSalesSetting } from "../../../../../actions/sales-settings";
import {
    composeControls,
    itemControlUidObject,
} from "../utils/item-control-utils";
import { DispatchItemPackingStatus } from "@sales/types";

export async function updateQtyControlAutoComplete(
    data,
    uid,
    { produceableQty, shippableQty, produceableChanged, shippableChanged, qty },
) {
    const { produceable, shippable } = data;
    await Promise.all(
        [
            {
                changed: produceableChanged,
                types: ["prodAssigned", "prodCompleted"] as QtyControlType[],
                newValue: produceable,
                totalQty: produceableQty,
            },
            {
                changed: shippableChanged,
                types: [
                    "dispatchAssigned",
                    "dispatchCompleted",
                    "dispatchInProgress",
                ] as QtyControlType[],
                newValue: shippable,
                totalQty: shippableQty,
            },
        ].map(async (p) => {
            if (p.changed) {
                await prisma.qtyControl.updateMany({
                    where: {
                        itemControlUid: uid,
                        type: {
                            in: p.types,
                        },
                    },
                    data: {
                        autoComplete: !p.newValue,
                    },
                });
                await Promise.all(
                    p.types?.map(async (type) => {
                        await updateQtyControlAction(uid, type, {
                            totalQty: p.totalQty,
                            ...qty,
                            reset: true,
                        });
                    }),
                );
            }
        }),
    );
}
export async function updateQtyControlAction(
    uid,
    type: QtyControlType,
    { qty, lh, rh, totalQty, reset = false } = { reset: false } as any,
) {
    const qtyControl = await prisma.qtyControl.upsert({
        where: {
            itemControlUid_type: {
                itemControlUid: uid,
                type,
            },
        },
        create: {
            type,
            itemControlUid: uid,
            // autoComplete,
        },
        update: {},
    });
    if (!qtyControl) throw new Error("Not found");
    qtyControl.rh = reset ? rh : sum([qtyControl.rh, rh]);
    qtyControl.lh = reset ? lh : sum([qtyControl.lh, lh]);
    qtyControl.qty = reset ? qty : sum([qtyControl.qty, qty]);

    qtyControl.total = qtyControl.autoComplete
        ? totalQty
        : sum([qtyControl.qty, qtyControl.rh, qtyControl.lh]);
    qtyControl.percentage = percent(qtyControl.total, totalQty);

    if (qtyControl.percentage > 100 || qtyControl.percentage < 0)
        throw new Error("Error performing action");
    await prisma.qtyControl.update({
        where: {
            itemControlUid_type: {
                itemControlUid: uid,
                type,
            },
        },
        data: {
            rh: qtyControl.rh,
            lh: qtyControl.lh,
            qty: qtyControl.qty,
            total: qtyControl.total,
            percentage: qtyControl.percentage,
        },
    });
}
export async function getItemControlAction(uid) {
    const control = await prisma.salesItemControl.findUnique({
        where: {
            uid,
        },
    });
    return control;
}

export type GetSalesItemControllables = AsyncFnType<
    typeof getSalesItemControllablesInfoAction
>;
export async function getSalesItemControllablesInfoAction(salesId) {
    const order = await prisma.salesOrders.findFirstOrThrow({
        where: { id: salesId },
        select: {
            id: true,
            isDyke: true,
            itemControls: {
                where: { deletedAt: null },
                include: {
                    qtyControls: true,
                },
            },
            stat: true,
            deliveries: {
                where: { deletedAt: null },
                select: {
                    id: true,
                    status: true,
                },
            },
            assignments: {
                where: { deletedAt: null },
                select: {
                    lhQty: true,
                    rhQty: true,
                    qtyAssigned: true,
                    itemId: true,
                    salesDoorId: true,
                    submissions: {
                        where: { deletedAt: null },
                        select: {
                            deletedAt: true,
                            qty: true,
                            rhQty: true,
                            lhQty: true,
                            itemDeliveries: {
                                where: {
                                    deletedAt: null,
                                    packingStatus:
                                        "packed" as DispatchItemPackingStatus,
                                },
                                select: {
                                    status: true,
                                    orderDeliveryId: true,
                                    qty: true,
                                    lhQty: true,
                                    rhQty: true,
                                },
                            },
                        },
                    },
                },
            },
            items: {
                where: { deletedAt: null },
                select: {
                    multiDykeUid: true,
                    dykeProduction: true,
                    swing: true,
                    qty: true,
                    id: true,
                    description: true,
                    dykeDescription: true,
                    formSteps: {
                        where: {
                            step: {
                                title: "Item Type",
                            },
                        },
                        select: {
                            prodUid: true,
                            value: true,
                            // step: {
                            //     select: { uid: true, meta: true },
                            // },
                        },
                    },
                    housePackageTool: {
                        where: { deletedAt: null },
                        select: {
                            stepProduct: {
                                where: { deletedAt: null },
                                select: {
                                    name: true,
                                    product: {
                                        where: { deletedAt: null },
                                        select: {
                                            title: true,
                                        },
                                    },
                                    door: {
                                        where: { deletedAt: null },
                                        select: {
                                            title: true,
                                        },
                                    },
                                },
                            },
                            molding: {
                                where: { deletedAt: null },
                                select: {
                                    title: true,
                                },
                            },
                            door: {
                                where: { deletedAt: null },
                                select: {
                                    title: true,
                                },
                            },
                            id: true,
                            moldingId: true,
                            doors: {
                                where: { deletedAt: null },
                                select: {
                                    dimension: true,
                                    id: true,
                                    lhQty: true,
                                    rhQty: true,
                                    totalQty: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
    const setting = await loadSalesSetting();
    const groupConfig = {};
    return {
        ...order,
        // setting,
        deliveries: order.deliveries.map((d) => {
            return {
                ...d,
                status: d.status as SalesDispatchStatus,
            };
        }),
        items: order.items.map((item) => {
            const mainStep = item.formSteps?.[0];
            const stepConfigUid = mainStep?.prodUid;
            let config =
                setting?.data?.route?.[stepConfigUid]?.config ||
                groupConfig?.[item.multiDykeUid];
            if (config) groupConfig[item.multiDykeUid] = config;
            const isService = mainStep?.value?.toLowerCase() == "services";
            return {
                ...item,
                itemStatConfig: order.isDyke
                    ? {
                          production: isService
                              ? item.dykeProduction
                              : config?.production,
                          shipping: config?.shipping,
                      }
                    : {
                          production: item.qty && item.swing,
                          shipping: !!item.qty,
                      },
            };
        }),
        assignments: order.assignments.map((a) => {
            return {
                ...a,
                submissions: a.submissions.map((s) => {
                    return {
                        ...s,
                        itemDeliveries: s.itemDeliveries
                            .filter((s) =>
                                order.deliveries.some(
                                    (a) => a.id == s.orderDeliveryId,
                                ),
                            )
                            .map((d) => {
                                return {
                                    ...d,
                                    status: d.status as SalesDispatchStatus,
                                };
                            }),
                    };
                }),
            };
        }),
    };
}
export async function updateItemQtyControlsAction(uid) {
    const control = await prisma.salesItemControl.findFirstOrThrow({
        where: { uid },
        include: {
            qtyControls: true,
        },
    });
    const qtyControls = qtyControlsByType(control.qtyControls);
    const qty = qtyControls.qty;
}
export async function updateSalesItemControlAction(salesId) {
    const order = await getSalesItemControllablesInfoAction(salesId);

    const controls = composeControls(order);

    // const resp = await prisma.$transaction((async (tx: typeof prisma) => {
    const tx = prisma;
    const del = await tx.qtyControl.deleteMany({
        where: {
            itemControl: {
                salesId: order.id,
            },
        },
    });
    const arr = await Promise.all(
        controls.map(async (c) => {
            if (c.create)
                return await tx.salesItemControl.create({ data: c.create });
            if (c.update)
                return await tx.salesItemControl.update({
                    data: c.update,
                    where: {
                        uid: c.uid,
                    },
                });
        }),
    );
    return { del, arr };
    // }) as any);

    // return resp;
}
