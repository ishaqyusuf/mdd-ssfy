import {
    getPageInfo,
    pageQueryFilter,
} from "@/app/(clean-code)/_common/utils/db-utils";
import { AsyncFnType, PageBaseQuery } from "@/app/(clean-code)/type";
import { userId } from "@/app/(v1)/_actions/utils";
import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { prisma, Prisma } from "@/db";
import { sum } from "@/lib/utils";

import { DispatchListInclude } from "../../../../../utils/db/dispatch";
import { SalesDispatchStatus } from "../../types";
import { excludeDeleted, whereDispatch } from "../utils/db-utils";
import { Qty, qtyDiff } from "./dto/sales-item-dto";
import {
    salesDispatchListDto,
    SalesShippingDto,
} from "./dto/sales-shipping-dto";
import {
    quickCreateAssignmentDta,
    submitAssignmentDta,
} from "./sales-prod.dta";
import { updateSalesProgressDta } from "./sales-progress.dta";

export type SalesDispatchFormData = AsyncFnType<typeof getSalesDispatchFormDta>;
export interface GetSalesDispatchListQuery extends PageBaseQuery {}
export async function getSalesDispatchDta(query: SearchParamsType) {
    const resp = await getSalesDispatchListDta(query);
    return {
        ...resp,
        data: resp.data.map(salesDispatchListDto),
    };
}
export async function getDispatchStatusDta(id): Promise<SalesDispatchStatus> {
    return (
        ((
            await prisma.orderDelivery.findUnique({
                where: { id },
            })
        )?.status as any) || "queue"
    );
}
export type GetSalesDispatchListDta = AsyncFnType<
    typeof getSalesDispatchListDta
>;
export async function getSalesDispatchListDta(
    query: GetSalesDispatchListQuery,
) {
    const where = whereDispatch(query);
    const data = await prisma.orderDelivery.findMany({
        where,
        ...pageQueryFilter(query),
        include: DispatchListInclude,
    });
    const pageInfo = await getPageInfo(query, where, prisma.orderDelivery);
    return {
        pageCount: pageInfo.pageCount,
        pageInfo,
        data,
    };
}
export async function initDispatchQuery(searchParams) {}

export async function getSalesDispatchFormDta(shipping: SalesShippingDto) {
    return {
        toggleAll: false,
        shipping,
        delivery: {
            deliveryMode: shipping.deliveryMode,
            status: "queue" as SalesDispatchStatus,
            createdBy: {
                connect: {
                    id: await userId(),
                },
            },
            order: {
                connect: {
                    id: shipping.orderId,
                },
            },
        } satisfies Prisma.OrderDeliveryCreateInput,
        selection: {} as {
            [itemId in string]: {
                selected: boolean;
                itemId: number;
                deliveryQty: Qty;
                pendingAssignment: number;
                pendingProduction: number;
                assignedToId: number;
            };
        },
    };
}
type CreateManyDeliveryItem = Prisma.OrderItemDeliveryCreateManyInput;
export async function deleteSalesDispatchDta(id) {
    const d = await prisma.orderDelivery.update({
        where: { id },
        data: {
            deletedAt: new Date(),
        },
        include: {
            items: {
                ...excludeDeleted,
            },
        },
    });
    let totalQty = sum(
        d.items.map((item) => sum([item.lhQty, item.rhQty]) || item.qty),
    );
    await prisma.orderItemDelivery.updateMany({
        where: {
            orderDeliveryId: d.id,
        },
        data: {
            deletedAt: new Date(),
        },
    });
    const status: SalesDispatchStatus = d.status as any;
    // if(status ==)
    await updateSalesProgressDta(d.salesOrderId, "dispatchCompleted", {
        minusScore: totalQty,
    });
}
export async function updateSalesDispatchStatusDta(
    id,
    status: SalesDispatchStatus,
    oldStatus: SalesDispatchStatus,
) {
    const dispatch = await prisma.orderDelivery.update({
        where: { id },
        data: {
            status,
        },
        include: {
            items: {
                select: {
                    qty: true,
                },
            },
        },
    });
    // const oldStatType = getQtyControlTypeByDispatch(oldStatus);
    // const newStatType = getQtyControlTypeByDispatch(status);
    const score = sum(dispatch.items.map((s) => s.qty));
    if (status == "cancelled")
        await updateSalesProgressDta(
            dispatch.salesOrderId,
            "dispatchCompleted",
            {
                minusScore: score,
            },
        );
    if (oldStatus == "cancelled" && status != oldStatus)
        await updateSalesProgressDta(
            dispatch.salesOrderId,
            "dispatchCompleted",
            {
                plusScore: score,
            },
        );
}

export async function createSalesDispatchDta(data: SalesDispatchFormData) {
    const orderId = data.delivery.order.connect.id;

    const __items = Object.values(data.selection).filter((s) => s.selected);
    if (__items.length == 0)
        throw new Error("Select atleast one item to create a shipping");
    const dispatch = await prisma.orderDelivery.create({
        data: data.delivery,
    });
    const deliveries = await Promise.all(
        __items.map(async (selection) => {
            const dispItem = {
                orderId,
                orderItemId: selection.itemId,
                orderDeliveryId: dispatch.id,
            } satisfies CreateManyDeliveryItem;
            const { analytics, deliverableSubmissions, assignments } =
                data.shipping.dispatchableItemList.find(
                    (item) => item.id == selection.itemId,
                );
            let qty = selection.deliveryQty; //{lh:10,rh:5}
            qty.total = sum([qty.lh, qty.rh]) || qty.qty;
            const hasHandle = qty.lh || qty.rh;
            const createManyData: CreateManyDeliveryItem[] = [];
            function updateHandleQty(sub, res, subId?) {
                let resp: CreateManyDeliveryItem | undefined = null;
                function updateItemDelivery(key, value) {
                    if (!resp)
                        resp = {
                            ...dispItem,
                        };
                    resp[key] = value;
                }
                (!hasHandle ? ["qty"] : ["lh", "rh"]).map((handl) => {
                    const key = hasHandle ? `${handl}Qty` : "qty";

                    const q = res[handl];
                    const subQ = sub[handl];
                    if (!qty[handl]) return;

                    if (q <= 0) {
                        updateItemDelivery(key, qty[handl]);
                        qty[handl] = 0;
                        qty.total = 0;
                    } else {
                        qty[handl] -= subQ;
                        qty.total -= subQ;
                        updateItemDelivery(key, subQ);
                    }
                });
                if (resp && subId) resp.orderProductionSubmissionId = subId;

                if (resp) {
                    if (hasHandle) resp.qty = sum([resp.lhQty, resp.rhQty]);

                    createManyData.push(resp);
                }
            }
            deliverableSubmissions.map((sub) => {
                const qtyRem = qtyDiff(qty, sub.qty, false);

                updateHandleQty(sub.qty, qtyRem, sub.subId);
            });

            if (qty.total > 0) {
                const assignment = await quickCreateAssignmentDta({
                    produceable: false,
                    qty,
                    itemId: selection.itemId,
                    orderId: data.delivery.order.connect.id,
                });

                const submission = await submitAssignmentDta(
                    {
                        qty: qty.total,
                        rhQty: qty.rh,
                        lhQty: qty.lh,
                        assignment: {
                            connect: {
                                id: assignment.id,
                            },
                        },
                        item: {
                            connect: {
                                id: assignment.itemId,
                            },
                        },
                        order: {
                            connect: {
                                id: assignment.orderId,
                            },
                        },
                    },
                    false,
                );
                const subQty = {
                    lh: submission.lhQty,
                    rh: submission.rhQty,
                    qty: hasHandle ? 0 : submission.qty,
                    total: submission.qty,
                };
                const qtyRem = qtyDiff(qty, subQty, false);

                updateHandleQty(subQty, qtyRem, submission.id);
            }

            if (createManyData.length) {
                const totalQty = sum(createManyData.map((s) => s.qty));

                await prisma.orderItemDelivery.createMany({
                    data: createManyData,
                });
                await updateSalesProgressDta(
                    dispatch.salesOrderId,
                    "dispatchCompleted",
                    {
                        plusScore: totalQty,
                    },
                );
            }
        }),
    );
    return {
        dispatch,
        deliveries,
    };
}
