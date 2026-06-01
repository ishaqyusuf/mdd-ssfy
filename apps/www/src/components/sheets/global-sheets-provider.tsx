"use client";

import { useSearchStore } from "@/store/search";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";

const GlobalSheets = dynamic(
	() => import("./global-sheets").then((mod) => mod.GlobalSheets),
	{
		ssr: false,
	},
);
const SearchModal = dynamic(() =>
	import("../search/search-modal").then((mod) => mod.SearchModal),
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
			<SearchModalGate />
			{hasOpenSheet ? <GlobalSheets /> : null}
		</>
	);
}

function SearchModalGate() {
	const { isOpen, setOpen } = useSearchStore();

	useHotkeys("meta+k", () => setOpen(), {
		enableOnFormTags: true,
		enabled: !isOpen,
	});

	return isOpen ? <SearchModal /> : null;
}
