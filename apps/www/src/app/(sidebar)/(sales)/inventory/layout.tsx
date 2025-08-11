import { InventoryTabs } from "@/components/inventory-tabs";
import { InventoryStockAlertWidget } from "@/components/widgets/inventory-stock-alert-widget";
import { InventorySummaryWidgets } from "@/components/widgets/inventory-summary-widgets";

export default async function Layout({ children }) {
    return (
        <div className="pt-6 flex flex-col gap-6">
            <InventorySummaryWidgets />
            <InventoryStockAlertWidget />
            <InventoryTabs />
            {children}
        </div>
    );
}

