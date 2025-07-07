import { createContext, useContext, useState } from "react";
import { useSalesOverview } from "../overview-provider";
import { ItemGroupType } from "../item-view/sales-items-overview";

export function useItemProdViewContext() {
    const ctx = useSalesOverview();
    const tabData = ctx.tabData;
    const payload: ItemGroupType = tabData.payload;
    const [item] = useState(() =>
        payload?.items?.find((_, i) => i == tabData.payloadSlug)
    );
    return {
        mainCtx: ctx,
        tabData,
        payload,
        item,
    };
}
export const ItemProdViewContext = createContext<
    ReturnType<typeof useItemProdViewContext>
>({} as any);
export const useItemProdView = () => useContext(ItemProdViewContext);
