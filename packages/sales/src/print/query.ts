import type { Prisma } from "@gnd/db";

const excludeDeletedWhere = { deletedAt: null } as const;

/**
 * Isolated Prisma include for print — only what the V2 print pipeline needs.
 * Never import SalesIncludeAll; keep the print query self-contained.
 */
export const PrintSalesInclude = {
  extraCosts: true,
  items: {
    where: excludeDeletedWhere,
    include: {
      formSteps: {
        where: excludeDeletedWhere,
        include: {
          step: true,
          component: true,
        },
      },
      shelfItems: {
        where: excludeDeletedWhere,
        include: { shelfProduct: true },
      },
      housePackageTool: {
        where: excludeDeletedWhere,
        include: {
          door: { where: excludeDeletedWhere },
          molding: { where: excludeDeletedWhere },
          stepProduct: {
            select: {
              name: true,
              img: true,
              product: { select: { title: true, img: true } },
              door: { select: { title: true, img: true } },
            },
          },
          doors: {
            where: excludeDeletedWhere,
            include: {
              stepProduct: {
                select: {
                  name: true,
                  img: true,
                  product: { select: { title: true, img: true } },
                  door: { select: { title: true, img: true } },
                },
              },
            },
          },
        },
      },
    },
  },
  customer: { where: excludeDeletedWhere },
  billingAddress: { where: excludeDeletedWhere },
  shippingAddress: { where: excludeDeletedWhere },
  salesRep: { where: excludeDeletedWhere },
  payments: { where: excludeDeletedWhere },
  taxes: {
    where: excludeDeletedWhere,
    include: { taxConfig: true },
  },
  deliveries: {
    where: excludeDeletedWhere,
    include: {
      items: {
        include: {
          submission: {
            include: { assignment: true },
          },
        },
      },
    },
  },
} satisfies Prisma.SalesOrdersInclude;

export type PrintSalesData = Prisma.SalesOrdersGetPayload<{
  include: typeof PrintSalesInclude;
}>;

export type PrintSalesItem = PrintSalesData["items"][number];
