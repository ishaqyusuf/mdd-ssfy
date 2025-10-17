"use server";

import { prisma } from "@/db";

export async function getSalesPaymentCustomers() {
  const customers = await prisma.customers.findMany({
    where: {
      salesOrders: {
        some: {
          type: "order",
          amountDue: {
            gt: 0,
          },
        },
      },
    },
    include: {
      wallet: true,
      salesOrders: {
        where: {
          type: "order",
          amountDue: {
            gt: 0,
          },
        },
      },
    },
  });

  return customers.sort(
    (a, b) =>
      ((a.businessName || a.name) as any) - ((b.businessName || b.name) as any)
  );
}
