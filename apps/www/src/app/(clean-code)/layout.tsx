import { GlobalModals } from "@/components/modals/global-modals";
import { GlobalSheets } from "@/components/sheets/global-sheets";
import { SidebarContent } from "@/components/sidebar-content";
import { TaskNotification } from "@/components/task-notification";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";

import { SalesQuickAction } from "@/components/sales-quick-action";
import { SalesNav } from "@/components/sales-nav";
import { TransactionOverviewModal } from "@/components/modals/transaction-overview-modal";
// export default
export default async function Layout({ children }) {
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
                    <GlobalSheets />
                    <GlobalModals />
                    <TaskNotification />
                    <SalesQuickAction />
                    <SalesNav />
                    <TransactionOverviewModal />
                </Suspense>

                {/* <GlobalTimerProvider />
                <TimezoneDetector /> */}
            </div>
        </HydrateClient>
    );
}

