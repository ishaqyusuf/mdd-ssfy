"use server";

import { prisma } from "@/db";
import { lastId, nextId } from "@/lib/nextId";
import { ISaveOrder } from "@/types/sales";
import dayjs from "dayjs";
import va from "@/lib/va";
import { fixSalesPaymentAction } from "./sales-payment";
import { transformData } from "@/lib/utils";
import { saveProgress } from "../../../_actions/progress";
import { user } from "../../../_actions/utils";
import { revalidatePath } from "next/cache";
import { _updateProdQty } from "@/app/(v2)/(loggedIn)/sales/_data-access/update-prod-qty.dac";

export async function saveOrderAction({ id, order, items }: ISaveOrder) {
    // const id= order.id
    // delete order?.id;
    // numeric<SalesOrders>()
    // items = items.map
    let orderId = order.orderId;
    let slug = order.slug;
    if (!order.type) order.type = "order";
    order.status = "Active";
    const {
        customerId,
        prodId,
        salesRepId,
        shippingAddressId,
        billingAddressId,
        ..._order
    } = order;

    if (!id) {
        const now = dayjs();
        slug = orderId = [
            now.format("YY"),
            now.format("MMDD"),
            await nextId(prisma.salesOrders),
        ].join("-");
        order.invoiceStatus = "Pending Items";
        // order.goodUntil
    }
    const metadata = {
        ...transformData<any>(_order, id != null),
        slug,
        orderId,
    };
    Object.entries({
        customer: customerId,
        shippingAddress: shippingAddressId,
        billingAddress: billingAddressId,
    }).map(([k, v]) => {
        v && (metadata[k] = { connect: { id: v } });
    });
    if (!id && salesRepId)
        metadata.salesRep = {
            connect: {
                id: salesRepId,
            },
        };
    let lastItemId: number | undefined = undefined;
    let updatedIds: any[] = [];
    if (id) {
        lastItemId = await lastId(prisma.salesOrderItems);
    }
    const updateMany = items
        .map((item) => {
            if (!item.id) return null;
            item.updatedAt = new Date();
            const { id, salesOrderId, ...data } = item;
            updatedIds.push(id);
            return {
                where: {
                    id,
                },
                data,
            };
            // return item;
        })
        .filter(Boolean) as any;
    const createMany = {
        data: items
            .map((item) => {
                if (item.id) return null;
                return transformData(item, true);
            })
            .filter(Boolean) as any,
    };
    const sale_order = id
        ? await prisma.salesOrders.update({
              where: { id },
              data: {
                  ...metadata,
                  items: {
                      updateMany,
                      createMany,
                  },
              },
          })
        : await prisma.salesOrders.create({
              data: {
                  ...metadata,
                  items: {
                      createMany,
                  },
              },
          });
    if (id) {
        const resp = await prisma.salesOrderItems.updateMany({
            where: {
                id: {
                    lte: lastItemId,
                    notIn: updatedIds,
                },
                salesOrderId: sale_order.id,
            },
            data: {
                deletedAt: new Date(),
            },
        });
        console.log(resp.count);
    }
    await _updateProdQty(sale_order.id);
    if (id) va.track("sales updated", { type: sale_order.type });
    else va.track("sales created", { type: sale_order.type });
    if (id && order.type == "order") await fixSalesPaymentAction(id);
    if (!id)
        await saveProgress("SalesOrder", id, {
            type: "sales",
            status: `${order.type} created`,
            headline: `${order.type} created by ${(await user()).name}`,
        });
    revalidatePath(`/(auth)/sales/${order.type}/${order.slug}/form`);
    return sale_order;
}
