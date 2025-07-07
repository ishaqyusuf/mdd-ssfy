"use server";

import { randomUUID } from "crypto";
import { _updateProdQty } from "@/app/(v2)/(loggedIn)/sales/_data-access/update-prod-qty.dac";
import { prisma, Prisma } from "@/db";
import { composeItemDescription } from "@/lib/sales/sales-invoice-form";
import { ISalesSetting, ISalesSettingMeta, PostTypes } from "@/types/post";
import {
    ISalesOrderItem,
    ISalesOrderItemMeta,
    ISalesOrderMeta,
    WizardKvForm,
} from "@/types/sales";

import { getSettingAction } from "../settings";

export async function dbUpgradeAction() {
    // const _ = await prisma.posts.groupBy({
    //   by: ["type"],
    //   _count: {
    //     type: true,
    //   },
    // });
    // return;

    await transformSettings();

    await addTypeToSalesOrder();
    await upgradeOrderQty();
    // await transformItemComponent();
    await updateProgressTypes();
}
async function transformSettings() {
    const s = await prisma.posts.findFirst({
        where: {
            type: PostTypes.SALES_SETTINGS,
        },
    });

    await prisma.settings.create({
        data: {
            type: PostTypes.SALES_SETTINGS,
            meta: s?.meta || {},
        },
    });
}
async function updateProgressTypes() {
    let updates: { [id in string]: number[] } = {};
    (
        await prisma.progress.findMany({
            select: {
                id: true,
                progressableType: true,
            },
        })
    ).map((p) => {
        let type: string = p.progressableType?.split("\\")?.pop() as any;

        if (!updates[type]) updates[type] = [p.id];
        else updates?.[type]?.push(p.id);
    });

    Object.entries(updates).map(async ([k, ids]) => {
        await prisma.progress.updateMany({
            where: {
                id: {
                    in: ids as any,
                },
            },
            data: {
                progressableType: k,
            },
        });
    });
}
async function addTypeToSalesOrder() {
    const updates: any = {
        order: [],
        estimate: [],
    };
    (
        await prisma.salesOrders.findMany({
            where: {
                deletedAt: null,
            },
            select: {
                id: true,
                prodId: true,
                meta: true,
            },
        })
    ).map((e) => {
        let meta: ISalesOrderMeta = e?.meta as any;
        // if (meta?.type == "quote") updates.estimate.push(e.id);
        // else updates.order.push(e.id);
    });
    await Promise.all(
        Object.entries(updates).map(async ([type, ids]) => {
            let data: any = {
                type,
            };
            if (type == "quote") data.prodId = null;
            await prisma.salesOrders.updateMany({
                where: {
                    id: {
                        in: ids as number[],
                    },
                },
                data,
            });
        }),
    );
}
async function upgradeOrderQty() {
    const orders = await prisma.salesOrders.findMany({
        where: { deletedAt: null },
        select: {
            id: true,
        },
    });
    orders.map(async (o) => {
        await _updateProdQty(o.id);
    });
}
interface oldComponentCost {
    id;
    type;
    title;
    qty;
    cost;
}
