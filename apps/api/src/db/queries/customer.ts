import type { TRPCContext } from "@api/trpc/init";
import type {
  GetCustomers,
  GetCustomerDirectoryV2SummarySchema,
  GetCustomerOverviewV2Schema,
  SearchCustomersSchema,
  UpsertCustomerSchema,
} from "@api/schemas/customer";
import type { Prisma } from "@gnd/db";
import { z } from "zod";
import type { AddressBookMeta, CustomerMeta } from "@sales/types";
import { composeQueryData } from "@gnd/utils/query-response";
import { whereCustomer, whereSales } from "@api/prisma-where";
import { salesAddressLines } from "@sales/utils/utils";
import type { SalesQueryParamsSchema } from "@sales/schema";
import { getCustomerWallet } from "@sales/wallet";
import { nextId, sum } from "@gnd/utils";
import { fetchDevicesByLocations, getSquareDevices } from "@gnd/square";
import { TRPCError } from "@trpc/server";

function buildCustomerLookupWhere(accountNo: string): Prisma.CustomersWhereInput {
  const [prefix, rawId] = accountNo.split("-");
  return {
    phoneNo: prefix === "cust" ? undefined : accountNo,
    id: prefix === "cust" ? Number(rawId) : undefined,
  };
}

function buildCustomerSalesFilter(accountNo: string, salesType?: "order" | "quote") {
  const [prefix, rawId] = accountNo.split("-");
  const query: Partial<SalesQueryParamsSchema> = {
    salesType,
  };
  if (prefix === "cust") query.customerId = Number(rawId);
  else query.phone = accountNo;
  return whereSales(query as SalesQueryParamsSchema);
}

function mapCustomerWorkspaceItem(
  item: Awaited<ReturnType<typeof getCustomerWorkspaceSales>>[number],
) {
  return {
    id: item.id,
    orderId: item.orderId,
    uuid: item.slug || item.orderId,
    displayName:
      item.billingAddress?.name ||
      item.customer?.businessName ||
      item.customer?.name ||
      null,
    salesDate: item.createdAt?.toISOString?.() || null,
    due: Number(item.amountDue || 0),
    invoice: {
      total: Number(item.grandTotal || 0),
    },
    status: item.status as
      | {
          delivery?: {
            status?: string | null;
          };
        }
      | null
      | undefined,
  };
}

async function getCustomerWorkspaceSales(
  ctx: TRPCContext,
  accountNo: string,
  salesType: "order" | "quote",
) {
  return ctx.db.salesOrders.findMany({
    where: buildCustomerSalesFilter(accountNo, salesType),
    orderBy: {
      createdAt: "desc",
    },
    take: 200,
    select: {
      id: true,
      orderId: true,
      slug: true,
      amountDue: true,
      grandTotal: true,
      createdAt: true,
      status: true,
      customer: {
        select: {
          name: true,
          businessName: true,
        },
      },
      billingAddress: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function getCustomers(ctx: TRPCContext, query: GetCustomers) {
  const { db } = ctx;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereCustomer(query),
    db.customers,
  );
  const data = await db.customers.findMany({
    where,
    ...searchMeta,
    include: {},
  });
  return await response(data.map((line) => line));
}

export async function createOrUpdateCustomer(
  ctx: TRPCContext,
  input: UpsertCustomerSchema,
) {
  return ctx.db.$transaction(async (tx) => {
    let customerId = input.id;
    const isBusiness = input.customerType === "Business";
    const customerData: any = {
      name: isBusiness ? null : input.name,
      businessName: isBusiness ? input.businessName : null,
      phoneNo: input.phoneNo,
      phoneNo2: input.phoneNo2,
      email: input.email,
      address: input.address1,
      meta: {
        netTerm: input.netTerm,
      } as CustomerMeta,
      profile: input.profileId
        ? {
            connect: {
              id: Number(input.profileId),
            },
          }
        : undefined,
      taxProfiles: input?.taxProfileId
        ? input?.taxCode
          ? {
              update: {
                where: {
                  id: Number(input.taxProfileId),
                },
                data: {
                  taxCode: input.taxCode,
                },
              },
            }
          : undefined
        : input?.taxCode
          ? {
              create: {
                taxCode: input.taxCode,
              },
            }
          : undefined,
    };

    if (input.id) {
      await tx.customers.update({
        where: {
          id: input.id,
        },
        data: customerData,
      });
    } else {
      const customer = await tx.customers.create({
        data: customerData,
      });
      customerId = customer.id;
    }

    if (!customerId) {
      const nextCustomerId = await nextId(tx.customers);
      customerId = nextCustomerId;
    }

    if (input.taxProfileId && !input.taxCode) {
      await tx.customerTaxProfiles.update({
        where: {
          id: Number(input.taxProfileId),
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    const addressData: any = {
      address1: input.address1,
      address2: input.address2,
      phoneNo2: input.phoneNo2,
      phoneNo: input.phoneNo,
      country: input.country,
      state: input.state,
      city: input.city,
      isPrimary: true,
      meta: {
        zip_code: input.zip_code,
        lat: input.lat,
        lng: input.lng,
        placeSearchText: input.formattedAddress,
      } as AddressBookMeta,
    };

    let addressId = input.addressId;
    if (addressId) {
      const existingPrimary = await tx.addressBooks.findFirst({
        where: {
          id: addressId,
          isPrimary: true,
        },
        select: {
          id: true,
        },
      });
      if (existingPrimary?.id) {
        const updated = await tx.addressBooks.update({
          where: { id: existingPrimary.id },
          data: addressData,
        });
        addressId = updated.id;
      } else {
        const created = await tx.addressBooks.create({
          data: {
            ...addressData,
            customerId,
            isPrimary: true,
          },
        });
        addressId = created.id;
      }
    } else {
      const created = await tx.addressBooks.create({
        data: {
          ...addressData,
          customerId,
          isPrimary: true,
        },
      });
      addressId = created.id;
    }

    return {
      customerId,
      addressId,
    };
  });
}

export async function createOrUpdateCustomerAddress(
  ctx: TRPCContext,
  input: UpsertCustomerSchema,
) {
  return ctx.db.$transaction(async (tx) => {
    let addressId = input.addressId;
    const customerId = input.customerId || input.id;
    if (!customerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Customer id is required for address update.",
      });
    }
    const name =
      input.customerType === "Business" ? input.businessName : input.name;
    const addressData: any = {
      name,
      phoneNo: input.phoneNo,
      phoneNo2: input.phoneNo2,
      email: input.email,
      address1: input.address1,
      city: input.city,
      state: input.state,
      country: input.country,
      address2: input.address2,
      meta: {
        zip_code: input.zip_code,
        lat: input.lat,
        lng: input.lng,
        placeSearchText: input.formattedAddress,
        placeId: input.placeId,
      } as AddressBookMeta,
      customer: {
        connect: {
          id: customerId,
        },
      },
    };

    if (addressId) {
      const ordersOnAddress = await tx.salesOrders.count({
        where: {
          OR: [
            {
              shippingAddressId: addressId,
            },
            {
              billingAddressId: addressId,
            },
          ],
        },
      });
      if (ordersOnAddress > 0) addressId = undefined;
    }
    if (addressId) {
      const updated = await tx.addressBooks.update({
        where: {
          id: addressId,
        },
        data: addressData,
      });
      addressId = updated.id;
    } else {
      const created = await tx.addressBooks.create({
        data: addressData,
      });
      addressId = created.id;
    }

    return {
      customerId,
      addressId,
    };
  });
}
export async function searchCustomers(
  ctx: TRPCContext,
  query: SearchCustomersSchema,
) {
  const { db } = ctx;
  const searchTerm = query.query;

  if (!searchTerm) {
    return [];
  }

  const customers = await db.customers.findMany({
    where: {
      OR: [
        {
          name: {
            contains: searchTerm,
            // mode: 'insensitive',
          },
        },
        {
          businessName: {
            contains: searchTerm,
            // mode: 'insensitive',
          },
        },
        {
          phoneNo: {
            contains: searchTerm,
            // mode: 'insensitive',
          },
        },
        {
          email: {
            contains: searchTerm,
            // mode: 'insensitive',
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      businessName: true,
      phoneNo: true,
      email: true,
    },
    take: 10, // Limit results for performance
  });

  return customers;
}

export async function getCustomerDirectoryV2Summary(
  ctx: TRPCContext,
  _query: GetCustomerDirectoryV2SummarySchema,
) {
  const { db } = ctx;

  const [totalCustomers, businessCustomers, customersWithEmail, openQuotes] =
    await Promise.all([
      db.customers.count(),
      db.customers.count({
        where: {
          businessName: {
            not: null,
          },
        },
      }),
      db.customers.count({
        where: {
          email: {
            not: null,
          },
        },
      }),
      db.salesOrders.count({
        where: {
          deletedAt: null,
          type: "quote",
        },
      }),
    ]);

  return {
    totalCustomers,
    businessCustomers,
    customersWithEmail,
    openQuotes,
  };
}

export async function getCustomerOverviewV2(
  ctx: TRPCContext,
  query: GetCustomerOverviewV2Schema,
) {
  const { db } = ctx;
  const accountNo = query.accountNo;
  const customer = await db.customers.findFirst({
    where: buildCustomerLookupWhere(accountNo),
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      businessName: true,
      phoneNo: true,
      phoneNo2: true,
      email: true,
      address: true,
      meta: true,
      profile: {
        select: {
          id: true,
          title: true,
        },
      },
      addressBooks: {
        where: {
          deletedAt: null,
        },
        orderBy: [
          {
            isPrimary: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        select: {
          id: true,
          name: true,
          email: true,
          phoneNo: true,
          phoneNo2: true,
          address1: true,
          address2: true,
          city: true,
          state: true,
          country: true,
          isPrimary: true,
          meta: true,
        },
      },
    },
  });

  const [pendingPaymentOrders, wallet, orderRecords, quoteRecords] =
    await Promise.all([
      getCustomerPendingSales(ctx, accountNo),
      getCustomerWallet(db, accountNo),
      getCustomerWorkspaceSales(ctx, accountNo, "order"),
      getCustomerWorkspaceSales(ctx, accountNo, "quote"),
    ]);

  const orders = orderRecords.map(mapCustomerWorkspaceItem);
  const quotes = quoteRecords.map(mapCustomerWorkspaceItem);
  const pendingPayment = sum(pendingPaymentOrders, "amountDue");
  const pendingDeliveryOrders = orders.filter(
    (order) => order.status?.delivery?.status !== "completed",
  );
  const customerMeta = (customer?.meta || {}) as CustomerMeta;
  const primaryAddress =
    customer?.addressBooks.find((address) => address.isPrimary) ||
    customer?.addressBooks[0] ||
    null;
  const secondaryAddresses =
    customer?.addressBooks.filter((address) => address.id !== primaryAddress?.id) ||
    [];
  const displayName =
    customer?.businessName || customer?.name || pendingPaymentOrders[0]?.customerName || accountNo;

  return {
    accountNo,
    customer: {
      id: customer?.id || null,
      name: customer?.name || null,
      businessName: customer?.businessName || null,
      displayName,
      email: customer?.email || pendingPaymentOrders[0]?.customerEmail || null,
      phoneNo: customer?.phoneNo || null,
      phoneNo2: customer?.phoneNo2 || null,
      address: customer?.address || null,
      profileName: customer?.profile?.title || null,
      profileId: customer?.profile?.id || null,
      netTerm: customerMeta?.netTerm || null,
      isBusiness: !!customer?.businessName,
    },
    addresses: {
      primary: primaryAddress,
      secondary: secondaryAddresses,
    },
    walletBalance: wallet?.balance || 0,
    general: {
      pendingPayment,
      pendingPaymentOrders,
      pendingDeliveryOrders,
      totalSalesCount: orders.length,
      totalQuotesCount: quotes.length,
      totalSalesValue: orders.reduce(
        (acc, order) => acc + Number(order.invoice.total || 0),
        0,
      ),
      totalQuotesValue: quotes.reduce(
        (acc, quote) => acc + Number(quote.invoice.total || 0),
        0,
      ),
    },
    salesWorkspace: {
      orders,
      quotes,
    },
  };
}

export const customerInfoSearchSchema = z.object({
  q: z.string().optional().nullable(),
  customerId: z.number().optional().nullable(),
  type: z.enum(["customer", "address"]),
});
export type CustomerInfoSearch = z.infer<typeof customerInfoSearchSchema>;
export async function customerInfoSearch(
  ctx: TRPCContext,
  { q, type, customerId }: CustomerInfoSearch,
) {
  const { db } = ctx;

  const contains = !q ? undefined : { contains: q };
  if (customerId) {
    const addresses = await db.addressBooks.findMany({
      where: {
        customerId,
        OR: contains
          ? [
              {
                address1: contains,
              },
              {
                email: contains,
              },
              {
                phoneNo: contains,
              },
            ]
          : undefined,
      },
    });
    return addresses.map((address) => {
      const meta: AddressBookMeta = address?.meta as any;

      return {
        customerId: address?.customerId,
        name: address?.name,
        address: address?.address1,
        phone: address?.phoneNo,
        addressId: address?.id,
        state: address?.state,
        city: address?.city,
        email: address.email,
        zipCode: meta?.zip_code,
      };
    });
  }
  const customers = await db.customers.findMany({
    take: q ? 15 : 5,
    distinct: ["name"],
    where: !q
      ? undefined
      : {
          OR: [
            {
              name: contains,
            },
            {
              phoneNo: contains,
            },
            {
              email: contains,
            },
            {
              address: contains,
            },
          ],
        },
    select: {
      id: true,
      name: true,
      businessName: true,
      phoneNo: true,
      email: true,
      address: true,
      profile: {
        select: {
          title: true,
          id: true,
        },
      },
      taxProfiles: {
        select: {
          tax: true,
        },
      },
      addressBooks: {
        where: {
          AND: [
            {
              OR: [
                {
                  isPrimary: true,
                },
                {
                  AND: [
                    {
                      isPrimary: false,
                    },
                  ],
                },
              ],
            },
            {
              address1: contains,
              address2: contains,
            },
          ],
        },
        select: {
          id: true,
          meta: true,
          billingOrders: {
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
            where: {
              taxes: {
                some: {
                  deletedAt: null,
                },
              },
            },
            select: {
              salesProfile: true,

              taxes: {
                take: 1,
                select: {
                  taxConfig: {
                    select: {
                      title: true,
                      taxCode: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return customers.map((customer) => {
    const [address] = customer?.addressBooks;
    const addressMeta = address?.meta as any as AddressBookMeta;
    const [taxProfile] = customer?.taxProfiles;
    return {
      customerId: customer?.id,
      name: customer?.name || customer?.businessName,
      address: customer?.address,
      phone: customer?.phoneNo,
      addressId: address?.id,
      taxName: taxProfile?.tax?.title,
      taxCode: taxProfile?.tax?.taxCode,
      profileName: customer?.profile?.title,
      profileId: customer?.profile?.id,
      email: customer.email,
      zipCode: addressMeta?.zip_code,
    };
  });
}

export const getSalesCustomerSchema = z.object({
  customerId: z.number(),
  billingId: z.number().optional().nullable(),
  shippingId: z.number().optional().nullable(),
});
export type GetSalesCustomerSchema = z.infer<typeof getSalesCustomerSchema>;

export async function getSalesCustomer(
  ctx: TRPCContext,
  query: GetSalesCustomerSchema,
) {
  const { db } = ctx;
  const { customerId, shippingId, billingId } = query;
  const customer = await db.customers.findUniqueOrThrow({
    where: {
      id: customerId,
    },
    include: {
      taxProfiles: {
        select: {
          taxCode: true,
          id: true,
        },
      },
      profile: true,
      addressBooks: {
        where: {
          OR: [
            {
              isPrimary: true,
            },
            {
              id: shippingId || undefined,
            },
            {
              id: billingId || undefined,
            },
          ],
        },
      },
    },
  });
  const billing = customer?.addressBooks?.find(
    (a) => a.id == billingId || a.isPrimary,
  );
  const shipping = customer?.addressBooks?.find((a) => a.id == shippingId);
  const customerMeta = customer?.meta as any as CustomerMeta;
  const [taxProfile] = customer?.taxProfiles;
  return {
    customerId: customer?.id,
    profileId: customer?.customerTypeId,
    customerData: [
      [customer?.name || customer?.businessName, customer?.phoneNo]
        ?.filter(Boolean)
        .join(", "),
      customer?.email,
    ].filter(Boolean),
    customer: {
      name: customer?.name || customer?.businessName,
      phone: customer?.phoneNo,
      email: customer?.email,
      address: billing,
    },
    shippingId,
    billingId,
    netTerm: customerMeta?.netTerm,
    shipping: {
      id: shipping?.id,
      lines:
        shipping?.id == billing?.id || !shipping?.id
          ? ["same as billing"]
          : salesAddressLines(shipping),
    },
    billing: {
      lines: salesAddressLines(billing!, customer),
      id: billing?.id,
    },
    taxCode: taxProfile?.taxCode,
    taxProfileId: taxProfile?.id,
  };
}

/*
getCustomerPayPortal: publicProcedure
      .input(getCustomerPayPortalSchema)
      .query(async (props) => {
        return getCustomerPayPortal(props.ctx, props.input);
      }),
*/
export const getCustomerPayPortalSchema = z.object({
  accountNo: z.string(),
});
export type GetCustomerPayPortalSchema = z.infer<
  typeof getCustomerPayPortalSchema
>;

export async function getCustomerPayPortal(
  ctx: TRPCContext,
  query: GetCustomerPayPortalSchema,
) {
  const { db } = ctx;
  const pendingSales = await getCustomerPendingSales(ctx, query.accountNo);
  const wallet = await getCustomerWallet(db, query.accountNo);
  const totalPayable = sum(pendingSales, "amountDue");
  const lastTerminalId = (
    await db.squarePayments.findFirst({
      where: {
        terminalId: {
          not: null,
        },
        createdById: ctx.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        terminalId: true,
      },
    })?.[0]
  )?.terminalId;
  const { terminals, errors: terminalError } = await getSquareDevices();
  // const byLocations = await fetchDevicesByLocations();
  // return {};
  return {
    pendingSales,
    totalPayable,
    terminals,
    error: {
      terminal: terminalError,
    },
    wallet,
    walletBalance: wallet.balance,
    // byLocations,
    lastTerminalId,
  };
}
export async function getCustomerPendingSales(ctx: TRPCContext, accountNo) {
  const { db } = ctx;
  const query: SalesQueryParamsSchema = {
    invoice: "pending",
    // "sales.type": "order",
    salesType: "order",
  };
  const [p1, p2] = accountNo?.split("-");
  if (p1 == "cust") query.customerId = Number(p2);
  else query["phone"] = accountNo;
  const where = whereSales(query);
  const ls = await db.salesOrders.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      amountDue: true,
      orderId: true,
      id: true,
      grandTotal: true,
      createdAt: true,
      billingAddress: {
        select: {
          name: true,
          email: true,
        },
      },
      customer: {
        select: {
          name: true,
          businessName: true,
          email: true,
        },
      },
    },
  });
  return ls.map(({ customer, billingAddress: bAddr, ...rest }) => ({
    ...rest,
    customerName: bAddr?.name || customer?.businessName || customer?.name,
    customerEmail: bAddr?.email || customer?.email, // || customer?.name,
  }));
}
