"use client";

import { SuperAdminGuard } from "../auth-guard";

import { BuilderFormModal } from "./builder-form-modal";
import { CommunityModelCostModal } from "./community-model-cost-modal";
import { CommunityTemplateModal } from "./community-template-modal";
import { ContractorPayoutOverviewModal } from "./contractor-payout-overview-modal";
import { CreateCommunityModelCostModal } from "./create-community-model-cost-modal";
import { CreateCommunityProjectModal } from "./create-community-project-modal";
import { DispatchStatusModal } from "./dispatch-status-modal";
import { DocumentReviewModal } from "./document-review-modal";
import { EmployeeFormModal } from "./employee-form-modal";
import { InboundSalesModal } from "./inbound-status-modal";
import { JobOverviewModal } from "./job-overview";
import { LaborCostModal } from "./labor-cost-modal";
import { ModelInstallCostModal } from "./model-install-cost-modal";
import { NewJobModal } from "./new-job";
import { SalesEmailSenderModal } from "./sales-email-sender";
import { SalesInvoicePreviewModal } from "./sales-invoice-preview-modal";
import { SalesPreviewModal } from "./sales-preview-modal";
import { SalesQuickPayModal } from "./sales-quick-pay-modal";
import { WorkOrderFormModal } from "./work-order-form-modal";

export function GlobalModals() {
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
			<SalesEmailSenderModal />
			<CommunityTemplateModal />
			<CreateCommunityModelCostModal />
			<SalesInvoicePreviewModal />
			<SalesQuickPayModal />
			<CommunityModelCostModal />
			<ContractorPayoutOverviewModal />
			{/* <Env isDev> */}
			<WorkOrderFormModal />

			{/* LEGACY */}

			<ModelInstallCostModal />
			<CreateCommunityProjectModal />
			<BuilderFormModal />
			<NewJobModal />
			<JobOverviewModal />
			{/* </Env> */}
		</>
	);
}
