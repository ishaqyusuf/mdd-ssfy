import { getAllSales, SalesQueryParam2 } from "@/data-access/sales";
import { composeListOrders } from "@/data/compose-sales";
import { AsyncFnType } from "@/types";

export type ListOrderUseCase = AsyncFnType<typeof listOrdersUseCase>;
export async function listOrdersUseCase(query: SalesQueryParam2) {
    query._type = "order";
    const { data, ...rest } = await getAllSales(query);

    return {
        ...rest,
        data: data.map(composeListOrders),
    };
}
