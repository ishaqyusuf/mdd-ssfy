"use client";

import { useAuth } from "@/hooks/use-auth";
import { useBuilderParams } from "@/hooks/use-builder-params";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { useCommunityProjectParams } from "@/hooks/use-community-project-params";
import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
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

	return (
		<>
			<SuperAdminGuard>
				<LaborCostModal />
			</SuperAdminGuard>
			<InboundSalesModal />
			<DispatchStatusModal />
			<DocumentReviewModal />
			<EmployeeFormModal />
			<SalesPreviewModal />

			{createTemplate || !!templateId ? <CommunityTemplateModal /> : null}
			{createModelCost ? <CreateCommunityModelCostModal /> : null}
			<SalesInvoicePreviewModal />
			<SalesQuickPayModal />
			{editModelCostTemplateId ? <CommunityModelCostModal /> : null}
			<ContractorPayoutOverviewModal />
			{/* <Env isDev> */}
			{openCustomerServiceId ? <WorkOrderFormModal /> : null}

			{/* LEGACY */}

			{!!editCommunityModelInstallCostId && !openToSide && !isCommunityUnit ? (
				<ModelInstallCostModal />
			) : null}
			{projectModalOpen ? <CreateCommunityProjectModal /> : null}
			{builderModalOpen ? <BuilderFormModal /> : null}
			<NewJobModal />
			<JobOverviewModal />
			{/* </Env> */}
		</>
	);
}
