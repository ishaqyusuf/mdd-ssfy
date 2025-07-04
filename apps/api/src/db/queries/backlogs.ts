import type { Database } from "@gnd/db";

export async function getBacklogs(db: Database, query) {
  const abc = await db.salesOrders.findFirst();
  return {
    abc,
  };
}
