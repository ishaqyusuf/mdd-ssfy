import type { TRPCContext } from "@api/trpc/init";
import type { SearchCustomersSchema } from "@api/schemas/customer";
import { z } from "zod";
import type { AddressBookMeta } from "@sales/types";

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
