import type { Database } from "@gnd/db";

export async function getBacklogs(db: Database, query) {
  const abc = db.salesOrders.findFirst();
  return {
    abc,
  };
}
