"use client";

import { useCommunityInventoryParams } from "@/hooks/use-community-inventory-params";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { useCustomerOverviewV2SheetQuery } from "@/hooks/use-customer-overview-v2-sheet-query";
import { useFilePreviewParams } from "@/hooks/use-file-preview-params";
import { useInboundView } from "@/hooks/use-inbound-filter-params";
import { useInventoryCategoryParams } from "@/hooks/use-inventory-category-params";
import { useInventoryInboundParams } from "@/hooks/use-inventory-inbound-params";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { useRolesParams } from "@/hooks/use-roles-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesOverviewV2SheetQuery } from "@/hooks/use-sales-overview-v2-sheet-query";
import dynamic from "next/dynamic";
import { AuthGuard } from "../auth-guard";
import { _perm } from "../sidebar-links";

const CommunityInventoryOverviewSheet = dynamic(() =>
    import("./community-inventory-overview").then(
        (mod) => mod.CommunityInventoryOverviewSheet,
    ),
);
const CustomerCreateSheet = dynamic(() =>
    import("./customer-create-sheet").then((mod) => mod.CustomerCreateSheet),
);
const CustomerOverviewSheet = dynamic(() =>
    import("./customer-overview-sheet").then(
        (mod) => mod.CustomerOverviewSheet,
    ),
);
const CustomerOverviewV2Sheet = dynamic(() =>
    import("../customer-v2/customer-overview-v2-sheet").then(
        (mod) => mod.CustomerOverviewV2Sheet,
    ),
);
const FileViewSheet = dynamic(() =>
    import("./file-view-sheet").then((mod) => mod.FileViewSheet),
);
const InboundOverviewSheet = dynamic(() =>
    import("./inbound-overview-sheet").then((mod) => mod.InboundOverviewSheet),
);
const InventoryCategorySheet = dynamic(() =>
    import("./inventory-category-sheet").then(
        (mod) => mod.InventoryCategorySheet,
    ),
);
const InventoryInboundSheet = dynamic(() =>
    import("./inventory-inbound-sheet").then(
        (mod) => mod.InventoryInboundSheet,
    ),
);
const InventoryProductSheet = dynamic(() =>
    import("./inventory-product-sheet").then(
        (mod) => mod.InventoryProductSheet,
    ),
);
const RolesProfilesSheet = dynamic(() => import("./roles-profile-sheet"));
const SalesOverviewSheet = dynamic(() => import("./sales-overview-sheet"));
const SalesOverviewSystemSheet = dynamic(
    () => import("./sales-overview-system-sheet"),
);
export function GlobalSheets() {
    const { params: inboundViewParams } = useInboundView();
    const legacySalesOverview = useSalesOverviewQuery();
    const v2SalesOverview = useSalesOverviewV2SheetQuery();
    const { opened: customerOverviewOpen } = useCustomerOverviewQuery();
    const customerOverviewV2 = useCustomerOverviewV2SheetQuery();
    const { params: createCustomerParams } = useCreateCustomerParams();
    const inventoryParams = useInventoryParams();
    const inventoryInboundParams = useInventoryInboundParams();
    const inventoryCategoryParams = useInventoryCategoryParams();
    const { opened: communityInventoryOpen } = useCommunityInventoryParams();
    const filePreview = useFilePreviewParams();
    const rolesParams = useRolesParams();

    return (
        <>
            {rolesParams.params.viewRoles ? (
                <AuthGuard rules={[_perm.is("editRole")]}>
                    <RolesProfilesSheet />
                </AuthGuard>
            ) : null}
            {inboundViewParams.viewInboundId ? <InboundOverviewSheet /> : null}
            {legacySalesOverview["sales-overview-id"] ? (
                <SalesOverviewSheet />
            ) : null}
            {v2SalesOverview.params.overviewSheetId ? (
                <SalesOverviewSystemSheet />
            ) : null}
            {customerOverviewOpen ? <CustomerOverviewSheet /> : null}
            {customerOverviewV2.opened ? <CustomerOverviewV2Sheet /> : null}
            {createCustomerParams.customerForm ? <CustomerCreateSheet /> : null}
            {inventoryParams.productId ? <InventoryProductSheet /> : null}
            {inventoryInboundParams.editInboundId ? (
                <InventoryInboundSheet />
            ) : null}
            {inventoryCategoryParams.editCategoryId ? (
                <InventoryCategorySheet />
            ) : null}
            {communityInventoryOpen ? (
                <CommunityInventoryOverviewSheet />
            ) : null}
            {filePreview.params.filePath || filePreview.params.documentId ? (
                <FileViewSheet />
            ) : null}
        </>
    );
}
