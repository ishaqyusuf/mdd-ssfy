import { InventoryStockOperationsPage } from "@/components/inventory/inventory-stock-operations-page";
import PageShell from "@/components/page-shell";
import { PageTitle } from "@gnd/ui/custom/page-title";

export default function InventoryStocksPage() {
	return (
		<PageShell>
			<PageTitle>Inventory Stock Operations</PageTitle>
			<InventoryStockOperationsPage />
		</PageShell>
	);
}
