import { composeQueryData } from "@api/query-response";
import type { SiteActionFilterParams } from "@api/schemas/site-actions";
import type { TRPCContext } from "@api/trpc/init";

export async function getSiteActions(
  ctx: TRPCContext,
  query: SiteActionFilterParams,
) {
  const { db } = ctx;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSiteAction(query),
    db.salesOrders,
  );
  const result = await db.siteActionTicket.findMany({
    where,
    ...searchMeta,
  });
  return await response(result);
}

function whereSiteAction(query: SiteActionFilterParams) {
  return {};
}
