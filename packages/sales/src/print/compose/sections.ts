import type { SalesSetting } from "../../exports";
import type { PrintSalesData } from "../query";
import type { PrintModeConfig, PrintSection } from "../types";
import { composeDoorSections } from "./door-sections";
import { suppressMetadataBackedGroupSiblings } from "./grouped-item-helpers";
import { composeLineItemSections } from "./line-item-sections";
import { composeMouldingSections } from "./moulding-sections";
import { composeServiceSections } from "./service-sections";
import { composeShelfSections } from "./shelf-sections";

export function composePrintSections(
	sale: PrintSalesData,
	config: PrintModeConfig,
	setting: SalesSetting | null,
	dispatchId?: number | null,
): PrintSection[] {
	const compositionSale = {
		...sale,
		items: suppressMetadataBackedGroupSiblings(sale.items),
	};

	return [
		...composeDoorSections(compositionSale, config, setting, dispatchId),
		...composeMouldingSections(compositionSale, config, dispatchId),
		...composeServiceSections(compositionSale, config, dispatchId),
		...composeShelfSections(compositionSale, config),
		...composeLineItemSections(compositionSale, config, dispatchId),
	].sort((a, b) => a.index - b.index);
}
