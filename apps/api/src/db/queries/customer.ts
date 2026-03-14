import type { TRPCContext } from "@api/trpc/init";
import type {
  GetCustomers,
  SearchCustomersSchema,
  UpsertCustomerSchema,
} from "@api/schemas/customer";
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
      if (ordersOnAddress > 0) addressId = null;
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
