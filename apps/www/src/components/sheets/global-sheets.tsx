"use client";
import { AuthGuard } from "../auth-guard";
import { SearchModal } from "../search/search-modal";
import { _perm } from "../sidebar/links";
import { CommunityInventoryOverviewSheet } from "./community-inventory-overview";
import { CustomerCreateSheet } from "./customer-create-sheet";
import { CustomerOverviewSheet } from "./customer-overview-sheet";
import { FileViewSheet } from "./file-view-sheet";
import { InboundOverviewSheet } from "./inbound-overview-sheet";
import { InventoryCategorySheet } from "./inventory-category-sheet";
import { InventoryInboundSheet } from "./inventory-inbound-sheet";
import { InventoryProductSheet } from "./inventory-product-sheet";
import RolesProfilesSheet from "./roles-profile-sheet";
import SalesOverviewSheet from "./sales-overview-sheet";

type Props = {
    //   defaultCurrency?: string;
};

export function GlobalSheets({}) {
    return (
        <>
            <AuthGuard rules={[_perm.is("editRole")]}>
                <RolesProfilesSheet />
            </AuthGuard>
            <SearchModal />
            <InboundOverviewSheet />
            <SalesOverviewSheet /> <CustomerOverviewSheet />{" "}
            <CustomerCreateSheet />
            <InventoryProductSheet />
            <InventoryInboundSheet />
            <InventoryCategorySheet />
            <CommunityInventoryOverviewSheet />
            <FileViewSheet />
        </>
    );
}
