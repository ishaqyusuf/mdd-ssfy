import type { SalesListInclude } from "@api/db/queries/sales";
import type { Prisma } from "@gnd/db";

type Item = Prisma.SalesOrdersGetPayload<{
  include: typeof SalesListInclude;
}>;
export function salesOrderDto(data: Item) {
  const deliveryOption = data?.deliveries?.[0]?.status || data?.deliveryOption;
  return data;
}
