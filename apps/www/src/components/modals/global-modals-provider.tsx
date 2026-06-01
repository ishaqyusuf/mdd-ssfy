"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

const GlobalModals = dynamic(
	() => import("./global-modals").then((mod) => mod.GlobalModals),
	{
		ssr: false,
	},
);

const MODAL_QUERY_KEYS = [
	"laborCostModal",
	"inboundOrderId",
	"dispatchSaleId",
	"openDocumentReviewId",
	"createEmployee",
	"editEmployeeId",
	"salesPreviewId",
	"createTemplate",
	"templateId",
	"openCommunityTemplateId",
	"createModelCost",
	"editModelCostTemplateId",
	"quickPaySalesId",
	"openContractorPayoutId",
	"openCustomerServiceId",
	"editCommunityModelInstallCostId",
	"openCommunityProjectId",
	"openBuilderId",
	"step",
	"openJobId",
];

export function GlobalModalsProvider() {
	const searchParams = useSearchParams();
	const hasOpenModal = MODAL_QUERY_KEYS.some((key) => searchParams.has(key));

	return hasOpenModal ? <GlobalModals /> : null;
}
