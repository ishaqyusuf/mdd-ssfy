import { SalesPreviewModal } from "@/components/modals/sales-preview-modal";
import { TransactionOverviewModal } from "@/components/modals/transaction-overview-modal";

import { SalesQuickAction } from "@/components/sales-quick-action";
import { CustomerCreateSheet } from "@/components/sheets/customer-create-sheet";
import { CustomerOverviewSheet } from "@/components/sheets/customer-overview-sheet";
import SalesOverviewSheet from "@/components/sheets/sales-overview-sheet";

import BackwardCompat from "./_backward-compat";
import NewSideBarLayout from "@/app/(sidebar)/layout";

export default async function Layout({ children, ...props }) {
    return <SideBarLayout1 {...props}>{children}</SideBarLayout1>;
    // return <LegaceLayout>{children}</LegaceLayout>;
}
function SideBarLayout1({ children }) {
    // await fixPaymentMethod();
    return (
        <NewSideBarLayout>
            {/* <ContentLayout> */}
            <SalesQuickAction />
            <BackwardCompat />
            {children}
            {/* </ContentLayout> */}
            <CustomerOverviewSheet />
            <SalesPreviewModal />
            <CustomerCreateSheet />

            <TransactionOverviewModal />
        </NewSideBarLayout>
    );
}
