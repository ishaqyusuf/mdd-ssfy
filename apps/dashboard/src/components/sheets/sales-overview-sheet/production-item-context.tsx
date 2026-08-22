import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import createContextFactory from "@/utils/context-factory";

import type { useProduction } from "./context";

export type ProductionItem = NonNullable<
	ReturnType<typeof useProduction>["data"]
>["items"][number];

export const {
	Provider: ProductionItemProvider,
	useContext: useProductionItem,
} = createContextFactory((item: ProductionItem) => ({
	item,
	queryCtx: useSalesOverviewQuery(),
}));
