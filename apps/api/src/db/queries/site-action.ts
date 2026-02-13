import { composeQueryData } from "@gnd/utils/query-response";
import type { SiteActionFilterParams } from "@api/schemas/site-actions";
import type { TRPCContext } from "@api/trpc/init";
import {
  createSiteActionTicket,
  type SiteTicketProps,
} from "@notifications/site-actions";

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

export async function createSiteAction(
  ctx: TRPCContext,
  props: Omit<SiteTicketProps, "authorId">,
) {
  const { db, userId } = ctx;
  return createSiteActionTicket(db, {
    ...props,
    authorId: userId!,
  });
}
