import type { TRPCContext } from "@api/trpc/init";
import { slugify } from "@gnd/utils";

export async function getMainCategories(ctx: TRPCContext) {
  const inventories = await ctx.db.inventoryType.findMany({
    where: {
      type: "shelf-item",
    },
  });

  return inventories.map((inventory) => {
    return {
      title: inventory.name,
      slug: slugify(inventory.name),
      uid: inventory.uid,
      img: inventory.img,
    };
  });
}
