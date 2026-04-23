"use client";

import { useAuth } from "@/hooks/use-auth";
import { useBuilderParams } from "@/hooks/use-builder-params";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { useCommunityProjectParams } from "@/hooks/use-community-project-params";
import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { useContractorPayoutParams } from "@/hooks/use-contractor-payout-params";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { useDispatchstatusModal } from "@/hooks/use-dispatch-status-modal";
import { useDocumentReviewParams } from "@/hooks/use-document-review-params";
import { useEmployeeParams } from "@/hooks/use-employee-params";
import { useInboundStatusModal } from "@/hooks/use-inbound-status-modal";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { useSalesPrintParams } from "@/hooks/use-sales-print-params";
import { useSalesQuickPay } from "@/hooks/use-sales-quick-pay";
import { isCommunityUnitRestrictedAccess } from "@gnd/utils/constants";
import dynamic from "next/dynamic";
import { SuperAdminGuard } from "../auth-guard";

import { ContractorPayoutOverviewModal } from "./contractor-payout-overview-modal";
import { DispatchStatusModal } from "./dispatch-status-modal";
import { DocumentReviewModal } from "./document-review-modal";
import { EmployeeFormModal } from "./employee-form-modal";
import { InboundSalesModal } from "./inbound-status-modal";
import { JobOverviewModal } from "./job-overview";
import { LaborCostModal } from "./labor-cost-modal";
import { NewJobModal } from "./new-job";
import { SalesInvoicePreviewModal } from "./sales-invoice-preview-modal";
import { SalesPreviewModal } from "./sales-preview-modal";
import { SalesQuickPayModal } from "./sales-quick-pay-modal";

const CommunityTemplateModal = dynamic(() =>
	import("./community-template-modal").then(
		(mod) => mod.CommunityTemplateModal,
	),
);
const CreateCommunityModelCostModal = dynamic(() =>
	import("./create-community-model-cost-modal").then(
		(mod) => mod.CreateCommunityModelCostModal,
	),
);
const CommunityModelCostModal = dynamic(() =>
	import("./community-model-cost-modal").then(
		(mod) => mod.CommunityModelCostModal,
	),
);
const WorkOrderFormModal = dynamic(() =>
	import("./work-order-form-modal").then((mod) => mod.WorkOrderFormModal),
);
const ModelInstallCostModal = dynamic(() =>
	import("./model-install-cost-modal").then((mod) => mod.ModelInstallCostModal),
);
const CreateCommunityProjectModal = dynamic(() =>
	import("./create-community-project-modal").then(
		(mod) => mod.CreateCommunityProjectModal,
	),
);
const BuilderFormModal = dynamic(() =>
	import("./builder-form-modal").then((mod) => mod.BuilderFormModal),
);

export function GlobalModals() {
	const auth = useAuth();
	const isCommunityUnit = isCommunityUnitRestrictedAccess(auth.can);
	const { createTemplate, templateId } = useCommunityTemplateParams();
	const { createModelCost, editModelCostTemplateId } =
		useCommunityModelCostParams();
	const { openCustomerServiceId } = useCustomerServiceParams();
	const { opened: projectModalOpen } = useCommunityProjectParams();
	const { editCommunityModelInstallCostId, openToSide } =
		useCommunityInstallCostParams();
	const { opened: builderModalOpen } = useBuilderParams();
	const { opened: jobFormOpen } = useJobFormParams();
	const { opened: jobOverviewOpen } = useJobParams();
	const { opened: salesPreviewOpen } = useSalesPreview();
	const { params: salesPrintParams } = useSalesPrintParams();
	const { params: salesQuickPayParams } = useSalesQuickPay();
	const { isOpened: inboundStatusOpen } = useInboundStatusModal();
	const { isOpened: dispatchStatusOpen } = useDispatchstatusModal();
	const { opened: documentReviewOpen } = useDocumentReviewParams();
	const { opened: employeeFormOpen } = useEmployeeParams();
	const { opened: contractorPayoutOpen } = useContractorPayoutParams();

	return (
		<>
			<SuperAdminGuard>
				<LaborCostModal />
			</SuperAdminGuard>
			{inboundStatusOpen ? <InboundSalesModal /> : null}
			{dispatchStatusOpen ? <DispatchStatusModal /> : null}
			{documentReviewOpen ? <DocumentReviewModal /> : null}
			{employeeFormOpen ? <EmployeeFormModal /> : null}
			{salesPreviewOpen ? <SalesPreviewModal /> : null}

			{createTemplate || !!templateId ? <CommunityTemplateModal /> : null}
			{createModelCost ? <CreateCommunityModelCostModal /> : null}
			{salesPrintParams.modal ? <SalesInvoicePreviewModal /> : null}
			{salesQuickPayParams.quickPaySalesId ? <SalesQuickPayModal /> : null}
			{editModelCostTemplateId ? <CommunityModelCostModal /> : null}
			{contractorPayoutOpen ? <ContractorPayoutOverviewModal /> : null}
			{/* <Env isDev> */}
			{openCustomerServiceId ? <WorkOrderFormModal /> : null}

			{/* LEGACY */}

			{!!editCommunityModelInstallCostId && !openToSide && !isCommunityUnit ? (
				<ModelInstallCostModal />
			) : null}
			{projectModalOpen ? <CreateCommunityProjectModal /> : null}
			{builderModalOpen ? <BuilderFormModal /> : null}
			{jobFormOpen ? <NewJobModal /> : null}
			{jobOverviewOpen ? <JobOverviewModal /> : null}
			{/* </Env> */}
		</>
	);
}
