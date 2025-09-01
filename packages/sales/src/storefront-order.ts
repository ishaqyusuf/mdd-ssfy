import { Db } from "@gnd/db";
import { z } from "zod";
import { addressSchema } from "./storefront-account";
import { nextId } from "@gnd/utils";

export const createCheckoutSchema = z.object({
  shipping: addressSchema,
  customerId: z.number(),
});
export type CreateCheckout = z.infer<typeof createCheckoutSchema>;

export async function createCheckout(db: Db, data: CreateCheckout) {
  const id = await nextId(db.salesOrders, {
    type: "store-order",
    deletedAt: {},
  });
  await db.salesOrders.create({
    data: {
      status: "store-checkout",
      type: "store-order",
      orderId: ``,
      customer: {
        connect: {
          id: data.customerId,
        },
      },
    },
  });
}
