"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { SearchModal } from "../search/search-modal";

const GlobalSheets = dynamic(
	() => import("./global-sheets").then((mod) => mod.GlobalSheets),
	{
		ssr: false,
	},
);
const SHEET_QUERY_KEYS = [
	"viewRoles",
	"viewInboundId",
	"sales-overview-id",
	"overviewSheetId",
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
			{hasOpenSheet ? <GlobalSheets /> : null}
		</>
	);
}
