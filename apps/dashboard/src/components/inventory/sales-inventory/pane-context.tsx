"use client";

import { type ReactNode, createContext, useContext } from "react";

export type InventoryNeedSelection = {
	componentIds: number[];
	title: string;
	subtitle: string | null;
	inventoryVariantId: number | null;
};
export type InventoryAdjustmentSelection = {
	inventoryVariantId: number;
	stockId?: number;
	returnNeed?: InventoryNeedSelection;
};
type Actions = {
	openNeed: (need: InventoryNeedSelection) => void;
	openAdjustment: (target: InventoryAdjustmentSelection) => void;
};
const Context = createContext<Actions | null>(null);
export function SalesInventoryPaneProvider({
	children,
	...actions
}: Actions & { children: ReactNode }) {
	return <Context.Provider value={actions}>{children}</Context.Provider>;
}
export function useSalesInventoryPanes() {
	return useContext(Context);
}
