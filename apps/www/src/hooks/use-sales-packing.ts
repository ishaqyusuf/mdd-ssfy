import { createContextFactory } from "@/utils/context-factory";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { useState } from "react";

interface Props {
    data: RouterOutputs["dispatch"]["dispatchOverview"];
}
export const { Provider: PackingProvider, useContext: usePacking } =
    createContextFactory(({ data }: Props) => {
        const [packItemUid, setPackItemUid] = useState(null);
        return {
            data,
            packItemUid,
            setPackItemUid,
        };
    });
export const { Provider: PackingItemProvider, useContext: usePackingItem } =
    createContextFactory(
        ({ item }: { item: Props["data"]["dispatchItems"][number] }) => {
            return {
                item,
            };
        },
    );

