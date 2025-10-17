import { Db } from "@gnd/db";
import { z } from "zod";
import { addressSchema } from "./storefront-account";
import { nextId } from "@gnd/utils";
import { generateSalesSlug } from "./utils/utils";
import { SalesType } from "./types";

export const createCheckoutSchema = z.object({
  shipping: addressSchema,
  customerId: z.number(),
  billingId: z.number(),
  primaryShipping: z.boolean(),
  additionalCosts: z.array(
    z.object({
      type: z.enum(["tax", "labor", "shipping"]),
    })
  ),
  subTotal: z.number(),
  total: z.number(),

  lines: z.array(
    z.object({
      id: z.number(),
      description: z.string(),
      qty: z.number(),
      unitCost: z.number(),
      totalCost: z.number(),
    })
  ),
});
export type CreateCheckout = z.infer<typeof createCheckoutSchema>;

export async function createCheckout(db: Db, data: CreateCheckout) {
  const id = await nextId(db.salesOrders, {
    type: "store-order",
    deletedAt: {},
  });
  const slug = await generateSalesSlug(
    "store-order",
    db.salesOrders,
    "Store Shopping Order"
  );

  await db.salesOrders.create({
    data: {
      status: "store-checkout",
      type: "store-order" as SalesType,
      slug,
      orderId: slug,
      amountDue: data.total,
      subTotal: data.subTotal,
      grandTotal: data.total,
      //   shippingAddress:
      billingAddress: {
        connect: {
          id: data.billingId,
        },
      },
      items: {
        createMany: {
          data: data.lines.map((l) => ({
            meta: {},
            description: l.description,
            qty: l.qty,
            price: l.unitCost,
            total: l.totalCost,
            salesPercentage: undefined,
            tax: undefined,
            taxPercenatage: undefined,
            rate: l.unitCost,
          })),
        },
      },
      customer: {
        connect: {
          id: data.customerId,
        },
      },
    },
  });
}
