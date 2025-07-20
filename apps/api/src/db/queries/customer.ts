import type { TRPCContext } from "@api/trpc/init";
import type { SearchCustomersSchema } from "@api/schemas/customer";

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
