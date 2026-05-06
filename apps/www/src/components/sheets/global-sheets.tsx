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
import { AuthGuard } from "../auth-guard";
import { CustomerOverviewV2Sheet } from "../customer-v2/customer-overview-v2-sheet";
import { SearchModal } from "../search/search-modal";
import { _perm } from "../sidebar-links";
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
import SalesOverviewSystemSheet from "./sales-overview-system-sheet";

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
			<SearchModal />
			{inboundViewParams.viewInboundId ? <InboundOverviewSheet /> : null}
			{legacySalesOverview["sales-overview-id"] ? <SalesOverviewSheet /> : null}
			{v2SalesOverview.params.overviewSheetId ? (
				<SalesOverviewSystemSheet />
			) : null}
			{customerOverviewOpen ? <CustomerOverviewSheet /> : null}
			{customerOverviewV2.opened ? <CustomerOverviewV2Sheet /> : null}
			{createCustomerParams.customerForm ? <CustomerCreateSheet /> : null}
			{inventoryParams.productId ? <InventoryProductSheet /> : null}
			{inventoryInboundParams.editInboundId ? <InventoryInboundSheet /> : null}
			{inventoryCategoryParams.editCategoryId ? (
				<InventoryCategorySheet />
			) : null}
			{communityInventoryOpen ? <CommunityInventoryOverviewSheet /> : null}
			{filePreview.params.filePath || filePreview.params.documentId ? (
				<FileViewSheet />
			) : null}
		</>
	);
}
