import { Prisma } from "@/db";
import { percent, sum } from "@/lib/utils";
import { qtyControlsByType } from "@/utils/sales-utils";
import { isEqual } from "lodash";

import {
    QtyControlByType,
    QtyControlType,
    SalesDispatchStatus,
} from "../../types";
import { GetSalesItemControllables } from "../data-actions/item-control.action";

export type ItemControlTypes = "door" | "molding" | "item";

export type ItemControl = {
    type: ItemControlTypes;
    doorId?;
    dim?;
    itemId?;
    hptId?;
};
export function itemControlUid(props: ItemControl) {
    const stacks = [props.type];
    if (props.doorId) {
        stacks.push(props.doorId);
        stacks.push(props.dim);
    } else {
        stacks.push(props.itemId);
        if (props.hptId) stacks.push(props.hptId);
    }
    return stacks.join("-");
}
export function itemControlUidObject(str) {
    const [type, x, ...y]: [ItemControlTypes, string, string[]] =
        str.split("-");
    const obj: ItemControl = { type };
    if (type == "door") {
        obj.doorId = +x;
        obj.dim = y.join("-");
    } else {
        obj.itemId = +x;
        if (type == "molding") obj.hptId = +y?.[0];
    }
    return obj;
}
export function itemItemControlUid(itemId) {
    return itemControlUid({
        type: "item",
        itemId,
    });
}
export function doorItemControlUid(doorId, dim) {
    return itemControlUid({
        type: "door",
        doorId,
        dim,
    });
}
export function mouldingItemControlUid(itemId, hptId) {
    return itemControlUid({
        type: "molding",
        itemId,
        hptId,
    });
}

type ItemControlComposer = {
    uid;
    qtyControls: QtyControlByType["qty"][];
    data: Prisma.SalesItemControlCreateManyInput;
};
interface ComposeQtyControlProps {
    order: GetSalesItemControllables;
    itemId: number;
    doorId?: number;
    controlUid: string;
    lh?;
    rh?;
    qty?;
    produceable;
    shippable;
}

function composeQtyControl(props: ComposeQtyControlProps) {
    const { produceable, shippable } = props;
    const totalQty = props.qty ? props.qty : sum([props.lh, props.rh]);
    if (!totalQty) return [];
    const previousControls = qtyControlsByType(
        props.order?.itemControls?.filter(
            (c) => c.uid == props.controlUid,
        ) as any,
    );

    const controls: QtyControlByType = {} as any;
    const totalProduceable = props.produceable ? totalQty : 0;
    const totalShippable = props.shippable ? totalQty : 0;

    controls.qty = {
        qty: props.qty,
        lh: props.lh,
        rh: props.rh,
        type: "qty",
        itemControlUid: props.controlUid,
        autoComplete: previousControls?.qty?.autoComplete,
        total: totalQty,
        itemTotal: totalQty,
    };
    let assignments = props.order.assignments.filter((a) =>
        props.doorId ? a.salesDoorId == props.doorId : a.itemId == props.itemId,
    );
    const singleHandle = assignments?.every((a) => !a.lhQty && !a.rhQty);
    controls.prodAssigned = {
        lh: sum(assignments, "lhQty"),
        rh: sum(assignments, "rhQty"),
        qty: singleHandle ? sum(assignments, "qtyAssigned") : 0,
        type: "prodAssigned",
        itemControlUid: props.controlUid,
        autoComplete: previousControls?.prodAssigned?.autoComplete,
        itemTotal: totalProduceable,
    };
    const submissions = assignments.map((a) => a.submissions).flat();
    controls.prodCompleted = {
        lh: sum(submissions, "lhQty"),
        rh: sum(submissions, "rhQty"),
        qty: singleHandle ? sum(submissions, "qty") : 0,
        type: "prodCompleted",
        itemControlUid: props.controlUid,
        autoComplete: previousControls?.prodCompleted?.autoComplete,
        itemTotal: totalProduceable,
    };
    const deliveries = props.order.deliveries;
    const dispatches = submissions.map((s) => s.itemDeliveries).flat();
    function registerDispatch(
        status: SalesDispatchStatus,
        controlType: QtyControlType,
    ) {
        const dispatchItems = dispatches.filter((d) => {
            const _status =
                d.status ||
                deliveries.find((del) => del.id == d.orderDeliveryId)?.status;
            switch (status) {
                case "queue":
                    return _status == status || !_status;
                    break;
                default:
                    return _status == status;
                    break;
            }
            // d.status
            //     ? d.status == status
            //     : deliveries.find((del) => del.id == d.orderDeliveryId)
            //           ?.status == status;
        });
        if (dispatchItems.length) console.log(dispatchItems);
        controls[controlType] = {
            lh: sum(dispatchItems, "lhQty"),
            rh: sum(dispatchItems, "rhQty"),
            qty: singleHandle ? sum(dispatchItems, "qty") : 0,
            type: controlType,
            itemControlUid: props.controlUid,
            autoComplete: previousControls?.[controlType]?.autoComplete,
            itemTotal: totalShippable,
        };
    }
    registerDispatch("cancelled", "dispatchCancelled");
    registerDispatch("completed", "dispatchCompleted");
    registerDispatch("in progress", "dispatchInProgress");
    registerDispatch("queue", "dispatchAssigned");
    return Object.values(controls).map((control) => {
        const _totalQty = control.autoComplete
            ? control.itemTotal
            : sum([control.qty, control.lh, control.rh]);

        control.total = _totalQty;
        switch (control.type) {
            case "prodAssigned":
            case "prodCompleted":
                if (props.produceable)
                    control.percentage = percent(_totalQty, control.itemTotal);
                else control.percentage = 0;
                break;
            case "qty":
            case "dispatchCancelled":
                break;
            default:
                if (props.shippable)
                    control.percentage = percent(_totalQty, control.itemTotal);
                else control.percentage = 0;
                break;
        }
        // control.itemTotal = totalQty;
        // control.percentage = percent(_totalQty, control.itemTotal);
        return control;
    });
}
export function composeControls(order: GetSalesItemControllables) {
    const controls: {
        uid;
        itemId;
        orderId;
        qtyControls: QtyControlByType["qty"][];
        data: Prisma.SalesItemControlUpdateInput;
    }[] = [];
    order.items.map((item) => {
        if (item?.housePackageTool) {
            if (item.housePackageTool?.doors?.length) {
                item.housePackageTool?.doors.map((door) => {
                    let controlUid = doorItemControlUid(
                        door.id,
                        door.dimension,
                    );
                    controls.push({
                        uid: controlUid,
                        itemId: item.id,
                        orderId: order.id,
                        qtyControls: composeQtyControl({
                            order,
                            controlUid,
                            itemId: item.id,
                            lh: door.lhQty,
                            rh: door.rhQty,
                            qty: !door.lhQty && !door.rhQty ? door.totalQty : 0,
                            doorId: door.id,
                            shippable: item.itemStatConfig?.shipping,
                            produceable: item.itemStatConfig?.production,
                        }),
                        data: {
                            subtitle: `${door.dimension}`,
                            shippable: item.itemStatConfig?.shipping,
                            produceable: item.itemStatConfig?.production,
                        },
                    });
                });
            } else {
                let controlUid = mouldingItemControlUid(
                    item.id,
                    item.housePackageTool.id,
                );
                controls.push({
                    uid: controlUid,
                    itemId: item.id,
                    orderId: order.id,
                    data: {
                        shippable: item.itemStatConfig?.shipping,
                        produceable: item.itemStatConfig?.production,
                        title: `${
                            item.housePackageTool?.stepProduct?.name ||
                            item.housePackageTool?.stepProduct?.product?.title
                        }`,
                    },
                    qtyControls: composeQtyControl({
                        order,
                        controlUid,
                        itemId: item.id,
                        qty: item.qty,
                        shippable: item.itemStatConfig?.shipping,
                        produceable: item.itemStatConfig?.production,
                    }),
                });
            }
        } else {
            let controlUid = itemItemControlUid(item.id);
            controls.push({
                uid: controlUid,
                itemId: item.id,
                orderId: order.id,
                data: {
                    shippable: true,
                    produceable: true,
                    title: `${item.description}`,
                    subtitle: [item.swing]?.filter(Boolean)?.join(" | "),
                },
                qtyControls: composeQtyControl({
                    order,
                    controlUid,
                    itemId: item.id,
                    qty: item.qty,
                    shippable: true,
                    produceable: true,
                }),
            });
        }
    });
    let response: {
        uid;
        create?: Prisma.SalesItemControlCreateInput;
        update?: Prisma.SalesItemControlUpdateInput;
        // qtyControls: Prisma.QtyControlCreateManyInput[];
    }[] = [];
    controls.map((control) => {
        const prevControl = order.itemControls.find(
            (c) => c.uid == control.uid,
        );
        if (prevControl) {
            let {
                qtyControls,
                salesId,
                orderItemId,
                deletedAt,
                uid,
                sectionTitle,
                ...rest
            } = prevControl;
            const equals = isEqual(rest, control.data);
            response.push({
                uid: control.uid,

                update: {
                    // uid: control.uid,
                    produceable: control.data.produceable,
                    title: control.data.title,
                    subtitle: control.data.subtitle,
                    shippable: control.data.shippable,
                    qtyControls: {
                        createMany: {
                            data: control.qtyControls.map((qty) => {
                                const prevQty = qtyControls.find(
                                    (c) => c.type == qty.type,
                                );

                                qty.autoComplete = prevQty?.autoComplete;
                                if (prevQty?.autoComplete) qty.percentage = 100;
                                const { itemControlUid, ...createData } = qty;
                                return createData;
                            }),
                        },
                    },
                },
            });
        } else
            response.push({
                uid: control.uid,
                create: {
                    uid: control.uid,
                    ...(control.data as any),
                    item: {
                        connect: { id: control.itemId },
                    },
                    sales: {
                        connect: { id: control.orderId },
                    },
                    qtyControls: {
                        createMany: {
                            data: control.qtyControls.map((cont) => {
                                const { itemControlUid, ...rest } = cont;
                                return rest;
                            }),
                        },
                    },
                },
            });
    });
    return response;
}

// export function transformHandlesQty({lhQty,rhQty,qty,})
