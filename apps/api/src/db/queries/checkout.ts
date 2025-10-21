import type { TRPCContext } from "@api/trpc/init";
import { timeout } from "@gnd/utils";
import { tokenSchemas, validateToken } from "@gnd/utils/tokenizer";
import z from "zod";
import { getOrders } from "./sales";

export const initializeCheckoutSchema = z.object({
  token: z.string(),
});
export type InitializeCheckoutSchema = z.infer<typeof initializeCheckoutSchema>;

export async function initializeCheckout(
  ctx: TRPCContext,
  query: InitializeCheckoutSchema
) {
  const { db } = ctx;
  const payload = validateToken(
    query.token,
    tokenSchemas.salesPaymentTokenSchema
  );
  const sales = await getOrders(ctx, {
    salesIds: payload?.salesIds,
    // invoice: "pending",
  });
  await timeout(1000);

  return {
    payload: payload!,
    sales: sales?.data?.filter((a) => a.due > 0),
    customerName: sales?.data?.[0]?.displayName,
  };
}
