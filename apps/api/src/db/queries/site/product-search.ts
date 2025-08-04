import type { TRPCContext } from "@api/trpc/init";
import { z } from "zod";

export const productSearchSchema = z.object({
  q: z.string(),
  categoryIds: z.array(z.number()),
});

export function productSearch(
  ctx: TRPCContext,
  query: z.infer<typeof productSearchSchema>
) {}
async function searchShelfInventories(
  ctx: TRPCContext,
  query: z.infer<typeof productSearchSchema>
) {
  const inventories = await ctx.db.inventory.findMany({
    where: {
      type: {
        AND: query.categoryIds.map((qid) => ({
          categories: {
            some: {
              id: qid,
            },
          },
        })),
      },
    },
    include: {
      category: true,
      variantPricings: {
        select: {
          inventoryId: true,
          costPrice: true,
        },
      },
    },
  });
  return inventories.map((i) => ({
    title: i.title,
  }));
}
