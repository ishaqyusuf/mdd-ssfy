"use server";

import { unstable_noStore } from "next/cache";
import { paginatedAction } from "@/app/_actions/get-action-utils";
import { _cache } from "@/app/(v1)/_actions/_cache/load-data";
import { prisma, Prisma } from "@/db";
import { sum, transformData } from "@/lib/utils";
import { BaseQuery } from "@/types/action";
import { ICustomer } from "@/types/customers";
import { ISalesType } from "@/types/sales";

import { InvoicePastDue, ShowCustomerHaving } from "../../type";
import customerSalesOrderQuery from "./customer-sales-order-query";

export interface IGetCustomerActionQuery extends BaseQuery {
    _having: ShowCustomerHaving;
    _due: InvoicePastDue;
}
export async function getCustomersAction(query: IGetCustomerActionQuery) {
    // dateQuery
    const salesQuery = customerSalesOrderQuery(query);
    const where: Prisma.CustomersWhereInput = {
        ...salesQuery,
    };

    if (query._q)
        where.OR = [
            {
                name: { contains: query._q },
            },
            {
                businessName: { contains: query._q },
            },
        ];
    const { pageCount, skip, take } = await paginatedAction(
        query,
        prisma.customers,
        where,
    );

    const _items = await prisma.customers.findMany({
        where,
        skip,
        take,
        orderBy: {
            name: "asc",
        },
        distinct: ["phoneNo"],
        include: {
            profile: true,
            addressBooks: true,
            _count: {
                select: {
                    salesOrders: {
                        where: salesQuery.salesOrders?.some ||
                            salesQuery.salesOrders?.every || {
                                deletedAt: null,
                                type: "order",
                            },
                    },
                },
            },
            salesOrders: {
                where: salesQuery.salesOrders?.some ||
                    salesQuery.salesOrders?.every || {
                        deletedAt: null,
                        type: "order" as ISalesType,
                        // amountDue: {
                        //     gt: 0,
                        // },
                    },
                select: {
                    amountDue: true,
                    billingAddress: {
                        select: {
                            phoneNo: true,
                            phoneNo2: true,
                            address1: true,
                        },
                    },
                },
            },
        },
    });

    return {
        pageCount,
        data: _items.map((customer) => {
            let primaryAddress = customer.addressBooks.find(
                (a) => a.id == customer.addressId,
            );
            if (!primaryAddress && customer.addressBooks.length > 0)
                primaryAddress = customer.addressBooks[0];
            return {
                ...customer,
                primaryAddress,
                amountDue: sum(customer.salesOrders.map((s) => s.amountDue)),
            };
        }),
    };
}
export interface ICustomerOverview {
    customer: ICustomer;
}
export async function getCustomerAction(id) {
    const _customer = await prisma.customers.findUnique({
        where: {
            id,
        },
        include: {
            profile: true,
            salesOrders: {
                where: {
                    type: "order",
                    deletedAt: null,
                },
            },
            wallet: true,
            _count: {
                select: {
                    salesOrders: {
                        where: {
                            type: "order",
                            deletedAt: null,
                        },
                    },
                },
            },
        },
    });
    if (!_customer) throw new Error("Customer not Found");
    let customer: ICustomer = _customer as any;

    customer._count.totalSales = sum(customer.salesOrders, "grandTotal");
    customer._count.amountDue = sum(
        customer.salesOrders.map((s) => Number(s.amountDue) || 0),
    );
    let pd = (customer._count.pendingDoors = sum(
        customer.salesOrders,
        "builtQty",
    ));
    let td = (customer._count.totalDoors = sum(
        customer.salesOrders,
        "prodQty",
    ));
    customer._count.completedDoors = (td || 0) - (pd || 0);
    let pendingCompletion = _customer.salesOrders?.filter(
        (s) => s.prodStatus != "Completed",
    ).length;
    customer._count.pendingOrders = pendingCompletion;
    customer._count.completedOrders = _customer.salesOrders?.filter(
        (s) => s.prodStatus == "Completed",
    ).length;

    return { customer };
}

export async function saveCustomer(customer: ICustomer) {
    let id = customer.id;
    if (!id) {
        const { email, name, meta, businessName, phoneNo } = customer;
        const customerTypeId = await getCustomerProfileId(customer);

        const _customer = await prisma.customers.create({
            data: {
                ...transformData({
                    // id: await nextId(prisma.customers),
                    email,
                    name,
                    businessName,
                    meta,
                    address: customer.primaryAddress.address1,
                    phoneNo,
                }),
                profile: customerTypeId
                    ? {
                          connect: {
                              id: Number(customerTypeId),
                          },
                      }
                    : null,
            } as any,
        });
        const _address = await prisma.addressBooks.create({
            data: {
                customerId: _customer.id,
                name: businessName || name,
                ...(transformData(customer.primaryAddress) as any),
                phoneNo,
            },
        });
    }
}
export async function getCustomerProfileId(customer: ICustomer) {
    let id = customer.customerTypeId;
    if (id == -1) {
        const { title, coefficient } = customer.profile || {};
        const profile = await prisma.customerTypes.create({
            data: transformData(
                {
                    title,
                    coefficient: Number(coefficient),
                },
                true,
            ) as any,
        });
        return profile.id;
    }

    return id;
}
export async function getStaticCustomers() {
    const customers = await prisma.customers.findMany({
        orderBy: {
            name: "asc",
        },
        distinct: "phoneNo",
    });
    return customers;
}
