import { Db, Prisma } from "@gnd/db";
import { GetInventoryCategories, InventoryProductsList } from "./schema";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { INVENTORY_STATUS, StockModes, StockStatus } from "./constants";
import { generateRandomNumber } from "@gnd/utils";
export async function inventoryProductsList(
  db: Db,
  query: InventoryProductsList
) {
  const where = whereInventoryProducts(query);
  const params = await composeQueryData(query, where, db.inventory);
  const data = await db.inventory.findMany({
    ...params.queryProps,
    include: {
      inventoryCategory: true,
      variantPricings: {
        select: {
          price: true,
        },
      },
    },
  });
  const response = await params.response(
    data.map((r) => {
      const stockMode = r.stockMode as StockModes;
      return {
        id: r.id,
        title: r.name,
        brand: r.inventoryCategory?.type,
        images: [],
        category: r.inventoryCategory?.title,
        variantCount: 1,
        totalStocks: "-",
        // stockValue: 500,
        status: (r.status || "draft") as INVENTORY_STATUS,
        stockMode,
        stockMonitored: stockMode == "monitored",
        stockValue: r?.variantPricings?.[0]?.price,
        stockStatus: generateRandomNumber(2) > 50 ? "Low Stock" : null,
      };
    })
  );
  return response;
}

function whereInventoryProducts(query: InventoryProductsList) {
  const wheres: Prisma.InventoryWhereInput[] = [];
  return composeQuery(wheres);
}

export async function getInventoryCategories(
  db: Db,
  data: GetInventoryCategories
) {
  const categories = await db.inventoryCategory.findMany({
    select: {
      id: true,
      title: true,
    },
  });
  return categories;
}
