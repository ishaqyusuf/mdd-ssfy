"use server";

import { _saveSales } from "@/app/(v2)/(loggedIn)/sales/_data-access/save-sales.persistence";
import salesFormUtils from "@/app/(v2)/(loggedIn)/sales/edit/sales-form-utils";
import { TruckLoaderForm } from "@/components/_v1/sales/load-delivery/load-delivery";
import { prisma, SalesPayments } from "@/db";
import { cloneOrder, cloneOrderItem } from "@/lib/sales/copy-order";
import { convertToNumber, toFixed } from "@/lib/use-number";
import { sum } from "@/lib/utils";
import { ISalesOrder, ISalesOrderItem } from "@/types/sales";

import { applyPaymentAction } from "./sales-payment";

interface BackOrderData {
    newOrder: {
        data: Partial<ISalesOrder>;
        items: Partial<ISalesOrderItem>[];
        applyPayment: { [id in number]: { amount: number } };
        newPayment: { amount: number };
    };
    oldOrder: {
        update: Partial<ISalesOrder>;
        updateItems: { [id in number]: Partial<ISalesOrderItem> }[];
        updatePayments: { [id in number]: Partial<SalesPayments> };
    };
}
export async function _createSalesBackOrder(
    order: ISalesOrder,
    backOrderForm: TruckLoaderForm,
    _status?: string,
) {
    const loader = backOrderForm.loader[order.slug];
    let {
        newOrder,
        slug,
        orderId,
        amountDue,
        prodStatus,
        goodUntil,
        salesRepId,
        prodId,
        payments,
        paymentTerm,
        items,
    } = cloneOrder(order);
    if (!amountDue) amountDue = 0;
    newOrder.prodStatus = prodStatus;
    newOrder.prodId = prodId;
    newOrder.salesRepId = salesRepId;
    newOrder.goodUntil = goodUntil;
    newOrder.paymentTerm = paymentTerm;
    newOrder.builtQty = newOrder.prodQty = 0;
    newOrder.slug = newOrder.orderId = [orderId, "BO"].join("-");
    newOrder.grandTotal =
        newOrder.subTotal =
        newOrder.tax =
        newOrder.meta.ccc =
        newOrder.meta.labor_cost =
            0;
    const orderUpdate = {
        grandTotal: 0,
        subTotal: 0,
        builtQty: 0,
        prodQty: 0,
        status: _status || order.status,
        tax: 0,
        meta: {
            ...order.meta,
            truckLoadLocation: loader?.truckLoadLocation,
            ccc: 0,
            labor_cost: 0,
        },
    } as ISalesOrder;
    let taxPercent = newOrder.taxPercentage || 0;

    let taxRatio = taxPercent ? taxPercent / 100 : 1;
    let oldTaxxable = 0;
    let newTaxxable = 0;
    const itemUpdates: { id: number; data: ISalesOrderItem }[] = [];
    let newOrderItems = items
        ?.map((_item) => {
            let {
                id,
                produced_qty,
                prodStatus,
                // prebuiltQty,
                sentToProdAt,
                prodStartedAt,
                prodCompletedAt,
                item,
            } = cloneOrderItem(_item);
            item.prodCompletedAt = prodCompletedAt;
            item.prodStatus = prodStatus;
            item.sentToProdAt = sentToProdAt;
            item.prodStartedAt = prodStartedAt;
            let itemTotal = item.total || 0;
            let itemQty = item.qty || 0;
            let itemRate = item.rate || 0;
            let loadQty = loader?.loadedItems[item.meta.uid]?.loadQty || 0;
            let backOrder = loader?.backOrders[item.meta.uid];
            let hasTax =
                item.meta.tax == salesFormUtils.taxxable(item.meta.tax);
            if (!produced_qty) produced_qty = 0;

            let itemUpdate = {
                meta: { ..._item.meta },
            } as ISalesOrderItem;
            if (!backOrder?.backQty) {
                // item is fully loaded
                if (hasTax && taxPercent) {
                    oldTaxxable += itemTotal;
                    // itemUpdate.tax = itemTotal * (taxPercent / 100);
                    // itemUpdate.updatedAt = new Date();
                }
                (orderUpdate.subTotal as any) += itemTotal;
            }
            if (!backOrder?.backQty && backOrder?.checked) {
                //register 0 qty item
                item.qty = 0;
                item.total = 0;
                return item;
            }
            if (backOrder?.backQty) {
                itemUpdate.qty = itemQty - backOrder?.backQty;
                item.qty = backOrder.backQty;
                item.total = +toFixed(item.qty * itemRate);
                itemUpdate.total = +toFixed(itemUpdate.qty * itemRate);
                itemUpdate.updatedAt = new Date();
                if (item.swing && produced_qty) {
                    let oldProduced = Math.min(
                        itemUpdate.meta.produced_qty || 0,
                        itemUpdate.qty,
                    );
                    itemUpdate.meta.produced_qty = oldProduced;
                    (orderUpdate.builtQty as any) += oldProduced;
                    let newProduced = produced_qty - oldProduced;
                    item.meta.produced_qty = newProduced;
                    (newOrder.builtQty as any) += newProduced;
                }
                if (item.swing) {
                    (newOrder.prodQty as any) += item.qty;
                    (orderUpdate.prodQty as any) += itemUpdate.qty;
                }
                (orderUpdate.subTotal as any) += itemUpdate.total;
                (newOrder.subTotal as any) += item.total;
                if (hasTax && taxPercent) {
                    oldTaxxable += itemUpdate.total;
                    newTaxxable += item.total;
                    itemUpdate.tax = +toFixed(
                        itemUpdate.total * (taxPercent / 100),
                    );
                    item.tax = +toFixed(item.total * (taxPercent / 100));
                }
                itemUpdates.push({ id, data: itemUpdate });
                return item;
            }
            return null;
        })
        .filter(Boolean);
    let [labor1, labor2] = calculateLaborCosts(
        newOrder.subTotal,
        orderUpdate.subTotal,
        convertToNumber(order.meta.labor_cost, 0),
    );
    newOrder.meta.labor_cost = labor1;
    orderUpdate.meta.labor_cost = labor2;
    let newTotal = +toFixed(newOrder.subTotal + labor1);
    let updateTotal = +toFixed(orderUpdate.subTotal + labor2);
    if (newTaxxable) newOrder.tax = +toFixed(newTaxxable * taxRatio);
    if (oldTaxxable) orderUpdate.tax = +toFixed(oldTaxxable * taxRatio);
    let [ccc1, ccc2] = calculateLaborCosts(
        newOrder.subTotal,
        orderUpdate.subTotal,
        order.meta.ccc || 0,
    );
    ccc1 = +toFixed(ccc1);
    ccc2 = +toFixed(ccc2);
    newOrder.meta.ccc = ccc1;
    orderUpdate.meta.ccc = ccc2;
    let newGrandTotal = (newOrder.grandTotal = ccc1 + newOrder.tax + newTotal);
    let updateGrandTotal = (orderUpdate.grandTotal =
        ccc2 + orderUpdate.tax + updateTotal);

    function _getData(o, p?, multiplier = 1) {
        return {
            grandTotal: o.grandTotal + multiplier * (p?.grandTotal || 0),
            tax: o.tax + multiplier * (p?.tax || 0),
            subTotal: o.subTotal + multiplier * (p?.subTotal || 0),
            amountDue: o.amountDue + multiplier * (p?.amountDue || 0),
            ccc: o.meta.ccc + multiplier * (p?.meta?.ccc || 0),
            labor: o.meta.labor_cost + multiplier * (p?.meta?.labor_cost || 0),
        };
    }
    let paymentUpdate = {
        transfers: [] as { id: number; amount: number }[],
        updates: {},
        newPaymentAmount: 0,
        amountDue,
        oldSumPayment: sum(payments, "amount") || 0,
        newSumPayment: 0,
        sumDiff: 0,
        payments: payments?.length,
    };

    if (amountDue >= newGrandTotal) {
        newOrder.amountDue = newGrandTotal;
        orderUpdate.amountDue = amountDue - newGrandTotal;
    } else {
        newOrder.amountDue = amountDue;
        orderUpdate.amountDue = 0;

        let backPayment = (newOrder.grandTotal || 0) - amountDue;
        let rem = backPayment;
        payments?.map((p) => {
            if (rem == 0) {
                paymentUpdate.newSumPayment += p.amount;
                return;
            }
            if (p.amount >= rem) {
                let _p = (paymentUpdate.updates[p.id] = +toFixed(
                    p.amount - rem,
                ));
                paymentUpdate.newPaymentAmount += rem;
                paymentUpdate.newSumPayment += rem + _p;
                rem = 0;
            } else {
                paymentUpdate.transfers.push({
                    id: p.id,
                    amount: p.amount,
                });
                paymentUpdate.newSumPayment += p.amount;
                rem -= +toFixed(p.amount);
            }
        });
    }

    let resp: any = {
        original: _getData(order),
        update: _getData(orderUpdate),
        new: _getData(newOrder),
        newOrder,
        newOrderItems,
        orderUpdate,
        itemUpdates,
        // subTotal: order.subTotal,
        // _subTotal: (orderUpdate.subTotal || 0) + newOrder.subTotal,
        // subTotalUpdate: orderUpdate.subTotal,
        // subTotalNew: newOrder.subTotal,
        // newOrderItems,
        // itemUpdates
    };
    resp.sum = _getData(orderUpdate, newOrder);
    resp.diff = {
        grandTotal: resp.sum.grandTotal - resp.original.grandTotal,
        tax: resp.sum.tax - resp.original.tax,
        subTotal: resp.sum.subTotal - resp.original.subTotal,
        ccc: resp.sum.ccc - resp.original.ccc,
        labor: resp.sum.labor - resp.original.labor,
    };
    // if (Math.abs(resp.diff.grandTotal) > 1)
    //     throw new Error("Error generate back order (800)");
    // console.log(paymentUpdate.oldSumPayment - paymentUpdate.newSumPayment);
    paymentUpdate.sumDiff =
        paymentUpdate.oldSumPayment - paymentUpdate.newSumPayment;
    console.log(resp);
    console.log(paymentUpdate);
    // if (Math.abs(paymentUpdate.sumDiff) > 1)
    //     throw new Error("Erorr generating back order (801)");

    resp.payment = paymentUpdate;
    // return resp;
    // return;
    // try {
    const _items = newOrderItems?.map((item, index) => {
        if (item?.meta) item.meta.uid = index;
        return item;
    });
    const _newOrder = await _saveSales(null, newOrder as any, _items as any);
    await Promise.all(
        itemUpdates.map(async ({ id, data }) => {
            await prisma.salesOrderItems.update({
                where: { id },
                data: data as any,
            });
        }),
    );
    await prisma.salesOrders.update({
        where: { id: order.id },
        data: orderUpdate as any,
    });
    if (paymentUpdate.newPaymentAmount > 0)
        await applyPaymentAction({
            orders: [
                {
                    id: _newOrder.id,
                    amountDue: _newOrder.amountDue,
                    amountPaid: paymentUpdate.newPaymentAmount,
                    customerId: _newOrder.customerId,
                    orderId: _newOrder.orderId,
                    checkNo: "",
                    paymentOption: "",
                    grandTotal: _newOrder.grandTotal,
                    salesRepId: _newOrder.salesRepId,
                },
            ],
            debit: paymentUpdate.newPaymentAmount,
            credit: 0,
            balance: 0,
        });
    // if(paymentUpdate.updates)
    await Promise.all(
        Object.entries(paymentUpdate.updates).map(async ([k, v]) => {
            await prisma.salesPayments.update({
                where: { id: +k as any },
                data: {
                    amount: v as any,
                },
            });
        }),
    );
    if (paymentUpdate.transfers.length)
        await prisma.salesPayments.updateMany({
            where: {
                id: {
                    in: paymentUpdate.transfers.map((t) => t.id),
                },
            },
            data: {
                orderId: _newOrder.id,
            },
        });
    // } catch (e) {
    // console.log(e);
    resp.error = true;
    // }
    return resp;
}

function calculateLaborCosts(subTotal1, subTotal2, labelCost) {
    // Validate that subTotal2 is not zero to avoid division by zero
    if (subTotal2 === 0) {
        return [labelCost, 0];
    }
    if (subTotal1 == 0) return [labelCost, 0];

    // Calculate the ratio
    const ratio = subTotal1 / subTotal2;

    // Calculate labor costs based on the ratio
    const labor1 = (labelCost * ratio) / 3; // Adjusted ratio for labor1
    const labor2 = labelCost * ratio * (2 / 3); // Adjusted ratio for labor2

    // Return the result as an object
    return [labor1, labor2];
}
