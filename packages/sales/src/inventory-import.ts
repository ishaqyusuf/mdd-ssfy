import { Db } from "@gnd/db";
import { InventoryImport } from "./schema";
import { generateInventoryCategoryUidFromShelfCategoryId } from "./utils/inventory-utils";

export async function inventoryImport(db: Db, data: InventoryImport) {
  //   const { db } = ctx;
  // const shelfCategories = (
  //   await db.dykeShelfCategories.findMany({
  //     where: {
  //       parentCategoryId: null,
  //     },
  //     select: {
  //       id: true,
  //       name: true,
  //       _count: {
  //         select: {
  //           groupedProducts: true,
  //         },
  //       },
  //     },
  //   })
  // ).map((c) => ({
  //   ...c,
  //   uid: generateInventoryCategoryUidFromShelfCategoryId(c.id),
  // }));
  const categories = await db.dykeSteps.findMany({
    distinct: "title",
    select: {
      uid: true,
      id: true,
      title: true,
      _count: {
        select: {
          stepProducts: {
            where: {
              deletedAt: null,
            },
            // distinct: ""
          },
        },
      },
    },
  });
  const inventories = await db.inventoryCategory.findMany({
    where: {
      uid: {
        in: [
          ...categories.map((c) => c.uid!),
          // ...shelfCategories.map((sc) => sc.uid),
        ],
      },
    },
    select: {
      uid: true,
      _count: {
        select: {
          inventories: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
  });
  function inventoryInfo(uid) {
    const i = inventories.find((a) => a.uid === uid);
    return {
      categoryUid: i?.uid,
      totalInventories: i?._count?.inventories,
    };
  }
  const response = {
    data: [
      // ...shelfCategories.map((c) => ({
      //   uid: c.uid,
      //   title: c.name,
      //   totalProducts: c._count?.groupedProducts,
      //   ...inventoryInfo(c.uid),
      //   subCategory: "shelf item",
      //   importCategoryId: c.id,
      // })),
      ...categories.map((c) => ({
        uid: c.uid,
        title: c.title,
        totalProducts: c._count?.stepProducts,
        ...inventoryInfo(c.uid),
        subCategory: "component",
        importCategoryId: c.id,
      })),
    ].sort((a, b) => a.title!?.localeCompare(b.title!)),
    //   ?.filter((a) => a.totalProducts > 0),
  };
  return response;
}
