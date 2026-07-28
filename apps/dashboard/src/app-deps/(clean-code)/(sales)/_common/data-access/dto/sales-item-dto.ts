import { SalesItemControl } from "@/db";
import { formatCurrency, sum } from "@/lib/utils";

import { SalesDispatchStatus } from "../../../types";
import {
    doorItemControlUid,
    itemControlUid,
    itemItemControlUid,
    mouldingItemControlUid,
} from "../../utils/item-control-utils";
import { inToFt, sortSalesItems } from "../../utils/sales-utils";
import { GetFullSalesDataDta } from "../sales-dta";
import { salesItemAssignmentsDto } from "./sales-item-assignment-dto";
import { deliveryBreakdownDto } from "./sales-shipping-dto";
import { salesItemsStatsDto } from "./sales-stat-dto";

interface Pill {
    label?: string;
    value?: string;
    text?: string;
    color?: string;
}
export interface Qty {
    qty?;
    lh?;
    rh?;
    total?;
}
interface Analytics {
    assignment?: Qty;
    production?: Qty;
    delivery?: Qty;
}
export type DeliveryBreakdown = {
    status?: {
        queue?: Qty;
        inProgress?: Qty;
        delivered?: Qty;
        cancelled?: Qty;
        backorder?: Qty;
    };
    pending?: Qty;
    totalDeliverable?: number;
    totalDeliveries?: number;
    percentage?: {
        queue?: number;
        inProgress?: number;
        delivered?: number;
        pending?: number;
    };
};
export interface LineItemOverview {
    salesItemId;
    swing?;
    orderId;
    doorItemId?;
    title: string;
    size?: string;
    totalQty: Qty;
    rate?: number;
    total?: number;
    hasSwing?: boolean;
    pills?: Pill[];
    analytics?: {
        success: Analytics;
        pending: Analytics;
        control: SalesItemControl;
        deliveryBreakdown: DeliveryBreakdown;
        info?: {
            title;
            text;
            percentage?: number;
            value?: number;
            total?: number;
        }[];
    };
    assignments?: {
        id;
        assignedTo;
        assignedToId;
        dueDate;
        qty: Qty;
        submitted: Qty;
        delivered: Qty;
        deliveries: {
            id;
            qty: Qty;
            date;
            deliveryId;
            submissionId;
            status: SalesDispatchStatus;
        }[];
        submissions: { id; qty: Qty; date }[];
        pending: Qty;
        _: {
            qtyAssigned;
            qtySubmitted;
        };
    }[];
}
type Item = GetFullSalesDataDta["items"][number];
export type Assignments = Item["assignments"];
export type FullSalesDeliveries = GetFullSalesDataDta["deliveries"];
export type LineAssignment = LineItemOverview["assignments"][number];
export type SalesOverviewDto = ReturnType<typeof salesOverviewDto>;
export function salesOverviewDto(data: GetFullSalesDataDta) {
    const itemGroup = salesItemGroupOverviewDto(data);
    // itemGroup.
    const stat = salesItemsStatsDto(data, itemGroup);
    return {
        id: data.id,
        orderId: data.orderId,
        itemGroup,
        stat,
    };
}

export function salesItemGroupOverviewDto(data: GetFullSalesDataDta) {
    const isQuote = data.type == "quote";
    function filter(item: Item, itemIndex) {
        if (data.isDyke) {
            return (
                (item.multiDyke && item.multiDykeUid) ||
                (!item.multiDyke && !item.multiDykeUid)
            );
        }
        return itemIndex == 0 || item.description?.includes("***");
    }
    data.items = data.items?.sort(sortSalesItems);
    const filteredItems = data.items.filter(filter);
    function itemControl(
        uid,
        def: { produceable: boolean; shippable: boolean },
    ) {
        let control = data.itemControls?.find((c) => c.uid == uid);
        if (!control)
            control = {
                ...def,
                uid,
                salesId: data.id,
            } as any;
        return control;
    }

    const itemGroup = filteredItems.map((item, fItemIndex) => {
        const startPointIndex = data.items.findIndex(
            (fi) => fi.id == filteredItems[fItemIndex]?.id,
        );
        let breakPointIndex = data.items.findIndex(
            (fi) => fi.id == filteredItems[fItemIndex + 1]?.id,
        );
        if (breakPointIndex < 0) breakPointIndex = data.items.length;
        //     -1;

        function filterGroup(_item: Item, itemIndex) {
            if (data.isDyke)
                return (
                    _item.id == item.id ||
                    (item.multiDyke && item.multiDykeUid == _item.multiDykeUid)
                );

            return _item.qty &&
                itemIndex >= startPointIndex &&
                breakPointIndex > 0
                ? itemIndex < breakPointIndex
                : itemIndex > startPointIndex &&
                      !_item?.description?.includes("**");
        }

        const groupedItems = data.items.filter(filterGroup);

        const items: LineItemOverview[] = [];
        groupedItems?.map((gItem) => {
            const {
                doors,
                door: od,
                // molding,
                stepProduct,
                doorType,
            } = gItem?.housePackageTool || {};
            if (doors?.length) {
                doors?.map((_door) => {
                    const doorTitle =
                        _door?.stepProduct?.name ||
                        od?.title ||
                        gItem?.housePackageTool?.stepProduct?.door?.title;
                    const pills = [
                        createTextPill(
                            inToFt(_door.dimension),
                            _door.dimension,
                            "blue",
                        ),
                    ];
                    let _totalQty;
                    let totalQty: Qty = {};
                    const isBifold = doorType == "Bifold";
                    const controlUid = doorItemControlUid(
                        _door.id,
                        _door.dimension,
                    );
                    const control = itemControl(controlUid, {
                        produceable: true,
                        shippable: true,
                    });
                    if (isBifold || (!_door.lhQty && !_door.rhQty)) {
                        let qty = _door.totalQty || _door.lhQty;
                        pills.push(createTextPill(`Qty x ${qty}`, qty, "blue"));
                        _totalQty = qty;
                        totalQty = {
                            total: _totalQty,
                            qty: _totalQty,
                        };
                    } else {
                        pills.push(
                            ...[
                                createTextPill(
                                    `${_door.lhQty} LH`,
                                    _door.lhQty,
                                    "blue",
                                ),
                                createTextPill(
                                    `${_door.rhQty} RH`,
                                    _door.rhQty,
                                    "orange",
                                ),
                            ],
                        );
                        _totalQty = sum([_door.lhQty, _door.rhQty]);
                        totalQty = {
                            total: _totalQty,
                            lh: _door.lhQty,
                            rh: _door.rhQty,
                        };
                    }
                    if (_door.swing)
                        pills.push(
                            createTextPill(_door.swing, _door.swing, "red"),
                        );

                    if (_totalQty > 1)
                        pills.push(
                            createTextPill(
                                `${formatCurrency.format(_door.unitPrice)}/1`,
                                _door.unitPrice,
                                "blue",
                            ),
                        );

                    items.push(
                        itemAnalytics(
                            {
                                size: _door.dimension,
                                swing: _door.swing,
                                hasSwing: !isBifold,
                                orderId: data.id,
                                salesItemId: gItem.id,
                                doorItemId: _door.id,
                                title: doorTitle,
                                totalQty,
                                rate: _door.unitPrice,
                                total: _door.lineTotal,
                                pills,
                            },
                            _door.productions,
                            {
                                control,
                                deliveries: data.deliveries,
                                isQuote,
                            },
                        ),
                    );
                });
            } else if (stepProduct) {
                const control = itemControl(
                    mouldingItemControlUid(gItem.id, stepProduct.id),
                    {
                        produceable: false,
                        shippable: true,
                    },
                );
                const pills = [
                    createTextPill(`qty x ${gItem.qty}`, gItem.qty, "purple"),
                ];
                if (gItem.qty > 0) {
                    pills.push(
                        createTextPill(
                            `${formatCurrency.format(gItem.rate)}/1`,
                            gItem.rate,
                            "blue",
                        ),
                    );
                }
                items.push(
                    itemAnalytics(
                        {
                            orderId: data.id,
                            salesItemId: gItem.id,
                            title:
                                stepProduct.name || stepProduct?.product?.title,
                            totalQty: {
                                qty: gItem.qty,
                                total: gItem.qty,
                            },
                            rate: gItem.rate,
                            total: gItem.total,
                            pills,
                        },
                        gItem.assignments,
                        {
                            control,
                            deliveries: data.deliveries,
                            isQuote,
                        },
                    ),
                );
            } else {
                const produceable =
                    gItem.dykeProduction ||
                    (!data.isDyke && gItem.swing != null);

                const control = itemControl(itemItemControlUid(gItem.id), {
                    produceable,
                    shippable: true,
                });
                items.push(
                    itemAnalytics(
                        {
                            swing: gItem.swing,
                            orderId: data.id,
                            salesItemId: gItem.id,
                            title: gItem.description,
                            totalQty: {
                                qty: gItem.qty,
                                total: gItem.qty,
                            },
                            // qty: {qty: gItem.qty},
                            rate: gItem.rate,
                            total: gItem.total,
                            pills: [
                                createTextPill(
                                    gItem.swing,
                                    gItem.swing,
                                    "purple",
                                ),
                                createTextPill(
                                    `qty x ${gItem.qty}`,
                                    gItem.qty,
                                    "purple",
                                ),
                            ],
                        },
                        gItem.assignments,
                        {
                            control,
                            deliveries: data.deliveries,
                            isQuote,
                        },
                    ),
                );
            }
        });

        return {
            sectionTitle:
                item.formSteps?.[0]?.value || starredTitle(item.description),
            items,
            style: componentStyle(item),
        };
    });

    return itemGroup;
}
function starredTitle(title: string) {
    if (title?.includes("***"))
        return title?.replaceAll("*", "")?.trim()?.toLocaleUpperCase();
    return null;
}
function itemAnalytics(
    data: LineItemOverview,
    assignments: Assignments,
    {
        control,
        deliveries,
        isQuote,
    }: { control: SalesItemControl; deliveries?; isQuote?: boolean },
) {
    // produceable = true,
    // deliverable = true
    if (isQuote) control.produceable = control.shippable = false;
    const { produceable, shippable: deliverable } = control;
    data.analytics = {
        control,
        success: {},
        pending: {},
        deliveryBreakdown: deliveryBreakdownDto(
            deliveries,
            assignments,
            control.shippable ? data.totalQty.total : 0,
        ),
    };

    if (produceable || deliverable) {
        const { analytics, totalQty } = data;
        const dynamicKey = data.totalQty.lh ? "lh" : "qty";
        if (produceable) {
            const _assignmentsLh = sum(assignments, "lhQty");
            const _assignmentsRh = sum(assignments, "rhQty");
            const totalAssignments = sum(assignments, "qtyAssigned");
            const prodCompleted = sum(
                assignments.map((a) => sum(a.submissions, "qty")),
            );
            const prodCompletedLh = sum(
                assignments.map((a) => sum(a.submissions, "lhQty")),
            );
            const prodCompletedRh = sum(
                assignments.map((a) => sum(a.submissions, "rhQty")),
            );
            analytics.success.assignment = {
                total: totalAssignments,
                rh: _assignmentsRh,
                [dynamicKey]: _assignmentsLh,
            };

            analytics.success.production = {
                total: prodCompleted,
                rh: prodCompletedRh,
                [dynamicKey]: prodCompletedLh,
            };
        }
        if (deliverable) {
            const deliveries = assignments
                .map((a) => a.submissions.map((s) => s.itemDeliveries).flat())
                .flat();
            const delivered = sum(deliveries, "qty");
            const deliveredLh = sum(deliveries, "lhQty");
            const deliveredRh = sum(deliveries, "rhQty");
            analytics.success.delivery = {
                [dynamicKey]: deliveredLh,
                rh: deliveredRh,
                total: delivered,
            };
        }
        analytics.pending = {
            assignment: produceable
                ? qtyDiff(totalQty, analytics.success.assignment)
                : {},
            delivery: !deliverable
                ? {}
                : qtyDiff(totalQty, analytics.success.delivery),
            production: produceable
                ? qtyDiff(totalQty, analytics.success.production)
                : {},
        };
        function registerInfo(text, key) {
            if (!analytics.info) analytics.info = [];
            const suc = analytics.success?.[key]?.total;
            const pen = analytics.pending?.[key]?.total;
            analytics.info.push({
                text: `${text}: ${suc}/${sum([suc, pen])}`,
                title: text,
                total: sum([suc, pen]),
                value: suc,
            });
        }
        if (produceable) {
            registerInfo("Assigned", "assignment");
            registerInfo("Completed", "production");
        }
        if (deliverable) registerInfo("Fulfilled", "delivery");
    }

    data.assignments = salesItemAssignmentsDto(data, assignments);
    return data;
}
export function qtyDiff(rh: Qty, lh: Qty, add = false): Qty {
    const mult = add ? 1 : -1;
    return {
        lh: sum([rh?.lh, (lh?.lh || 0) * mult]),
        rh: sum([rh?.rh, (lh?.rh || 0) * mult]),
        total: sum([rh?.total, (lh?.total || 0) * mult]),
        qty: sum([rh?.qty, (lh?.qty || 0) * mult]),
    };
}

function componentStyle(item: Item) {
    let styles: Pill[] = [];
    // item.formSteps?.filter(validateShowComponentStyle).map((fs) => {
    //     styles.push(createPill(fs.step.title, fs.value));
    // });
    return styles?.filter((s) => s.value);
}

function createTextPill(text, value, color = "blue") {
    return {
        text,
        value,
        color,
    };
}
function createPill(label, value, color = "blue") {
    return {
        label,
        value,
        color,
    };
}
// function createProgress
