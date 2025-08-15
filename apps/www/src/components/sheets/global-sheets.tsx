"use client";
import { AuthGuard } from "../auth-guard";
import { SearchModal } from "../search/search-modal";
import { _perm } from "../sidebar/links";
import { CustomerCreateSheet } from "./customer-create-sheet";
import { CustomerOverviewSheet } from "./customer-overview-sheet";
import { InboundOverviewSheet } from "./inbound-overview-sheet";
import { InventoryCategorySheet } from "./inventory-category-sheet";
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
            <InventoryCategorySheet />
        </>
    );
}
