import type { SiteActionFilterParams } from "@api/schemas/site-actions";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import {
  type SiteTicketProps,
  createSiteActionTicket,
} from "@gnd/notifications/site-actions";
import { composeQueryData } from "@gnd/utils/query-response";

export async function getSiteActions(
  ctx: TRPCContext,
  query: SiteActionFilterParams,
) {
  const { db } = ctx;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereSiteAction(query),
    db.siteActionTicket,
    {
      sortFn: sortSiteActions,
    },
  );
  const result = await db.siteActionTicket.findMany({
    where,
    ...searchMeta,
  });
  return await response(result);
}

function sortSiteActions(sort: string, sortOrder: string) {
  const direction = sortOrder === "asc" ? "asc" : "desc";

  switch (sort) {
    case "event":
      return {
        event: direction,
      };
    case "description":
    case "activity":
      return {
        description: direction,
      };
    case "id":
    case "reference":
      return {
        id: direction,
      };
    default:
      return {
        createdAt: direction,
      };
  }
}

function whereSiteAction(query: SiteActionFilterParams) {
  const where: Prisma.SiteActionTicketWhereInput[] = [];

  if (query.q?.trim()) {
    const q = query.q.trim();
    where.push({
      OR: [
        {
          description: {
            contains: q,
          },
        },
        {
          event: {
            contains: q,
          },
        },
        {
          type: {
            contains: q,
          },
        },
      ],
    });
  }

  if (query.status?.trim()) {
    where.push({
      event: query.status.trim(),
    });
  }

  return where.length > 0
    ? {
        AND: where,
      }
    : {};
}

export async function createSiteAction(
  ctx: TRPCContext,
  props: Omit<SiteTicketProps, "authorId">,
) {
  const { db, userId } = ctx;
  if (!userId) {
    throw new Error("Site action author is required");
  }

  return createSiteActionTicket(db, {
    ...props,
    authorId: userId,
  });
}
