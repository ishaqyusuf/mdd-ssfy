import type { TRPCContext } from "@api/trpc/init";
import { slugify } from "@gnd/utils";

export async function getMainCategories(ctx: TRPCContext) {
  const inventories = await ctx.db.inventoryCategory.findMany({
    where: {
      productKind: "inventory",
    },
  });

  return inventories.map((inventory) => {
    return {
      title: inventory.title,
      slug: slugify(inventory.title),
      uid: inventory.uid,
      img: inventory.img,
    };
  });
}
