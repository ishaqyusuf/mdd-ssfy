import type { TRPCContext } from "@api/trpc/init";
import type {
  GetCustomers,
  SearchCustomersSchema,
} from "@api/schemas/customer";
import { z } from "zod";
import type { AddressBookMeta, CustomerMeta } from "@sales/types";
import { composeQueryData } from "@gnd/utils/query-response";
import { whereCustomer } from "@api/prisma-where";
import { salesAddressLines } from "@sales/utils/utils";

export async function getCustomers(ctx: TRPCContext, query: GetCustomers) {
  const { db } = ctx;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereCustomer(query),
    db.customers
  );
  const data = await db.customers.findMany({
    where,
    ...searchMeta,
    include: {},
  });
  return await response(data.map((line) => line));
}
export async function searchCustomers(
  ctx: TRPCContext,
  query: SearchCustomersSchema
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
  { q, type, customerId }: CustomerInfoSearch
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
      profileName: customer?.profile?.title,
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
  query: GetSalesCustomerSchema
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
    (a) => a.id == billingId || a.isPrimary
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
