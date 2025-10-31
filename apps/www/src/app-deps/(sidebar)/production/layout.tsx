import { ProductionAlertWidget } from "@/components/production-alert-widget";
import { ProductioDashboardHeader } from "@/components/production-dashboard-header";
import { ProductionDashboardTabs } from "@/components/production-dashboard-tabs";

export default async function Layout({ children }) {
    return (
        <div className="flex w-full flex-col bg-muted/40">
            <main className="flex-1 space-y-6 p-4 sm:p-6">
                <ProductioDashboardHeader />
                <ProductionAlertWidget />
                <ProductionDashboardTabs />
                {children}
            </main>
        </div>
    );
}

