import { Db, Prisma } from "@gnd/db";
import { InventoryProductsList } from "./schema";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { StockStatus } from "./constants";
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
    },
  });
  const response = await params.response(
    data.map((r) => {
      return {
        id: r.id,
        title: r.name,
        brand: r.inventoryCategory?.type,
        images: [],
        category: r.inventoryCategory?.title,
        variantCount: 1,
        totalStocks: "-",
        stockValue: 500,
        status: "not managed" as StockStatus,
      };
    })
  );
  return response;
}

function whereInventoryProducts(query: InventoryProductsList) {
  const wheres: Prisma.InventoryWhereInput[] = [];
  return composeQuery(wheres);
}
