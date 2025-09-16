import type { TRPCContext } from "@api/trpc/init";
import {
  transformActivityTags,
  type ActivityType,
} from "@gnd/notifications/utils";
import type { NoteTagNames } from "@gnd/utils/constants";
import { z } from "zod";

export const getSalesHxSchema = z.object({
  salesNo: z.string(),
});
export type GetSalesHx = z.infer<typeof getSalesHxSchema>;

export async function getSalesHx(ctx: TRPCContext, data: GetSalesHx) {
  const activities = await ctx.db.notePad.findMany({
    where: {
      AND: [
        {
          tags: {
            some: {
              tagName: "salesNo" as NoteTagNames,
              tagValue: {
                startsWith: `${data.salesNo}-hx`,
                // contains: "05349PC-hx01",
                // contains: `${data.salesNo}-hx`,
              },
            },
          },
        },
        {
          tags: {
            some: {
              tagName: `activity` as NoteTagNames,
              tagValue: {
                in: [
                  "sales_invoice_updated",
                  "quote_invoice_updated",
                ] as ActivityType[],
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      createdAt: true,
      senderContact: {
        select: {
          name: true,
        },
      },
      tags: true,
    },
  });
  //   const {tags,..}
  return activities.map((a) => {
    const { tags, ...r } = a;
    return {
      ...r,
      tags: transformActivityTags(tags as any),
    };
  });
}
