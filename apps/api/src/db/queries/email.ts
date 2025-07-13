import type { SalesQueryParamsSchema } from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import { getSales } from "./sales";

export async function getSalesEmailMeta(
  ctx: TRPCContext,
  query: SalesQueryParamsSchema,
) {
  const { data } = await getSales(ctx, {
    ...query,
  });
  return data;
}
