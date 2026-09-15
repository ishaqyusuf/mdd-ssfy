"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { SearchModal } from "../search/search-modal";

const SalesRequestQuickCreateModal = dynamic(
	() =>
		import("../sales-request/sales-request-quick-create-modal").then(
			(mod) => mod.SalesRequestQuickCreateModal,
		),
	{ ssr: false },
);

const GlobalSheets = dynamic(
	() => import("./global-sheets").then((mod) => mod.GlobalSheets),
	{
		ssr: false,
	},
);
const SHEET_QUERY_KEYS = [
	"assistantDiagnostic",
	"viewInboundId",
	"sales-overview-id",
	"viewCustomer",
	"accountNo",
	"customerOverviewV2",
	"customerOverviewV2AccountNo",
	"customerForm",
	"productId",
	"editInboundId",
	"editCategoryId",
	"openCommunityInventoryId",
	"filePath",
	"documentId",
];

export function GlobalSheetsProvider() {
	const searchParams = useSearchParams();
	const hasOpenSheet = SHEET_QUERY_KEYS.some((key) => searchParams.has(key));

	return (
		<>
			<SearchModal />
			<SalesRequestQuickCreateModal />
			{hasOpenSheet ? <GlobalSheets /> : null}
		</>
	);
}
