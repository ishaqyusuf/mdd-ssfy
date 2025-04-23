import { SalesPreviewModal } from "@/components/modals/sales-preview-modal";
import { TransactionOverviewModal } from "@/components/modals/transaction-overview-modal";
import { SalesEmailSender } from "@/components/sales-email-sender";
import { SalesQuickAction } from "@/components/sales-quick-action";
import { CustomerCreateSheet } from "@/components/sheets/customer-create-sheet";
import { CustomerOverviewSheet } from "@/components/sheets/customer-overview-sheet";
import SalesOverviewSheet from "@/components/sheets/sales-overview-sheet";

import { ContentLayout } from "../../../components/(clean-code)/content-layout";
import SidebarLayout from "../../../components/(clean-code)/side-bar-layout";
import BackwardCompat from "./_backward-compat";

export default async function Layout({ children }) {
    // await fixPaymentMethod();
    return (
        <SidebarLayout>
            <ContentLayout>
                <SalesQuickAction />
                <BackwardCompat />
                {children}
            </ContentLayout>
            <CustomerOverviewSheet />
            <SalesPreviewModal />
            <SalesOverviewSheet />
            <CustomerCreateSheet />
            <TransactionOverviewModal />
            <SalesEmailSender />
        </SidebarLayout>
    );
}
