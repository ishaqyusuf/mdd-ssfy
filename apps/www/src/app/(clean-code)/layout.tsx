import { GlobalModalsProvider } from "@/components/modals/global-modals-provider";
import { GlobalSheetsProvider } from "@/components/sheets/global-sheets-provider";
import { SidebarContent } from "@/components/sidebar-content";
import { TaskNotificationProvider } from "@/components/task-notification-provider";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";

import { TransactionOverviewModal } from "@/components/modals/transaction-overview-modal";
import { SalesNav } from "@/components/sales-nav";
import { SalesQuickAction } from "@/components/sales-quick-action";
import { getInitialTableSettings } from "@/utils/columns";
// export default
export const dynamic = "force-dynamic";

export default async function Layout({ children }) {
	const [txApplicationSettings, txPaymentSettings] = await Promise.all([
		getInitialTableSettings("transaction-overview-applications"),
		getInitialTableSettings("transaction-overview-payments"),
	]);

	// return <>{children}</>;
	return (
		<HydrateClient>
			<div className="relative">
				<SidebarContent>
					{children}
					{/* <Sidebar />

                    <div className="md:ml-[70px] pb-8">
                        <Header />
                        <div className="px-6">{children}</div>
                    </div> */}
				</SidebarContent>

				<Suspense>
					<GlobalSheetsProvider />
					<GlobalModalsProvider />
					<TaskNotificationProvider />
					<SalesQuickAction />
					<SalesNav />
					<TransactionOverviewModal
						applicationInitialSettings={txApplicationSettings}
						paymentInitialSettings={txPaymentSettings}
					/>
				</Suspense>

				{/* <GlobalTimerProvider />
                <TimezoneDetector /> */}
			</div>
		</HydrateClient>
	);
}
