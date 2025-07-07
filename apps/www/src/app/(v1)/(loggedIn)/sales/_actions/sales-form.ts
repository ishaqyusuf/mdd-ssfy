"use server";

import { CustomerTypes, prisma } from "@/db";
import { authOptions } from "@/lib/auth-options";
import { sum } from "@/lib/utils";
import { ISalesSettingMeta, PostTypes } from "@/types/post";
import { ISalesOrder, ISalesType } from "@/types/sales";
import dayjs from "dayjs";

import { user } from "../../../_actions/utils";

export interface ICreateOrderFormQuery {
    customerId?;
    addressId?;
    type?: ISalesType;
    salesRep?;
    orderId?;
    salesRepId?;
}
export interface SalesFormResponse {
    form: ISalesOrder;
    ctx: SalesFormCtx;
    paidAmount: number;
}
export interface SalesFormCtx {
    settings: ISalesSettingMeta;
    swings: (string | null)[];
    suppliers: (string | null)[];
    profiles: CustomerTypes[];
    defaultProfile: CustomerTypes;
    items: any[];
}
export async function salesFormAction(
    query: ICreateOrderFormQuery,
): Promise<SalesFormResponse> {
    const order = await prisma.salesOrders.findFirst({
        where: {
            orderId: query.orderId,
        },
        include: {
            customer: true,
            items: {
                include: {},
            },
            salesRep: true,
            billingAddress: true,
            shippingAddress: true,
            payments: {
                select: {
                    // id:true,
                    amount: true,
                },
            },
        },
    });
    if (!order) return await newSalesFormAction(query);
    const { payments, ..._order } = order;
    const ctx = await formCtx();
    let paidAmount = sum(payments, "amount");
    return {
        form: _order as any,
        ctx,
        paidAmount: paidAmount as any,
    };
}
async function formCtx(): Promise<SalesFormCtx> {
    const setting = await prisma.settings.findFirst({
        where: {
            type: PostTypes.SALES_SETTINGS,
        },
    });
    const meta: ISalesSettingMeta = setting?.meta as any;
    const extras = await prisma.posts.findMany({
        where: {
            type: {
                in: [PostTypes.SUPPLIERS, PostTypes.SWINGS],
            },
        },
        distinct: ["title"],
        select: {
            type: true,
            title: true,
        },
    });
    const profiles = await prisma.customerTypes.findMany({
        select: {
            id: true,
            coefficient: true,
            defaultProfile: true,
            title: true,
        },
    });
    const items = await prisma.salesOrderItems.findMany({
        where: {},
        distinct: "description",
        select: {
            description: true,
        },
    });
    console.log(items.length);
    return {
        settings: meta,
        profiles: profiles as any,
        defaultProfile: profiles.find((p) => p.defaultProfile) as any,
        swings: extras
            .filter((e) => e.type == PostTypes.SWINGS)
            .map((e) => e.title),
        suppliers: extras
            .filter((e) => e.type == PostTypes.SUPPLIERS)
            .map((e) => e.title),
        items,
    };
}
async function newSalesFormAction(
    query: ICreateOrderFormQuery,
): Promise<SalesFormResponse> {
    const ctx = await formCtx();

    const session = await user();
    const form = {
        taxPercentage: ctx?.settings?.tax_percentage,
        type: query.type,
        status: "Active",
        meta: {
            // sales_profile: ctx.defaultProfile?.title,
            sales_percentage: ctx.defaultProfile?.coefficient,
        },
        salesRepId: session?.id,
        salesRep: {
            name: session?.name,
        },
        createdAt: dayjs().toISOString() as any,
    } as ISalesOrder;
    if (query.customerId) {
        const customer = await prisma.customers.findFirst({
            where: { id: { equals: +query.customerId } },
            include: {
                profile: true,
                addressBooks: {
                    take: 1,
                    orderBy: {
                        createdAt: "desc",
                    },
                },
            },
        });
        if (customer) {
            form.customerId = customer.id;
            form.customerProfileId = ctx.defaultProfile?.id;
            form.meta.sales_percentage =
                customer.profile?.coefficient || ctx?.settings?.sales_margin;
            const addr = {
                ...(customer.addressBooks?.[0] || {}),
            } as any;
            form.billingAddressId = form.shippingAddressId = addr?.id;
            form.billingAddress = form.shippingAddress = addr;
        }
    }
    return {
        form,
        ctx,
        paidAmount: 0,
    };
}
