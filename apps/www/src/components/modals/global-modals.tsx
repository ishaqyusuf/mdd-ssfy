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
import { useLaborCostModal } from "@/hooks/use-labor-cost-modal";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { useSalesQuickPay } from "@/hooks/use-sales-quick-pay";
import { isCommunityUnitRestrictedAccess } from "@gnd/utils/constants";
import dynamic from "next/dynamic";
import { SuperAdminGuard } from "../auth-guard";

const ContractorPayoutOverviewModal = dynamic(() =>
    import("./contractor-payout-overview-modal").then(
        (mod) => mod.ContractorPayoutOverviewModal,
    ),
);
const DispatchStatusModal = dynamic(() =>
    import("./dispatch-status-modal").then((mod) => mod.DispatchStatusModal),
);
const DocumentReviewModal = dynamic(() =>
    import("./document-review-modal").then((mod) => mod.DocumentReviewModal),
);
const EmployeeFormModal = dynamic(() =>
    import("./employee-form-modal").then((mod) => mod.EmployeeFormModal),
);
const InboundSalesModal = dynamic(() =>
    import("./inbound-status-modal").then((mod) => mod.InboundSalesModal),
);
const JobOverviewModal = dynamic(() =>
    import("./job-overview").then((mod) => mod.JobOverviewModal),
);
const LaborCostModal = dynamic(() =>
    import("./labor-cost-modal").then((mod) => mod.LaborCostModal),
);
const NewJobModal = dynamic(() =>
    import("./new-job").then((mod) => mod.NewJobModal),
);
const SalesPreviewModal = dynamic(() =>
    import("./sales-preview-modal").then((mod) => mod.SalesPreviewModal),
);
const SalesQuickPayModal = dynamic(() =>
    import("./sales-quick-pay-modal").then((mod) => mod.SalesQuickPayModal),
);

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
    import("./model-install-cost-modal").then(
        (mod) => mod.ModelInstallCostModal,
    ),
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
    const { params: salesQuickPayParams } = useSalesQuickPay();
    const { isOpened: inboundStatusOpen } = useInboundStatusModal();
    const { isOpened: dispatchStatusOpen } = useDispatchstatusModal();
    const { opened: documentReviewOpen } = useDocumentReviewParams();
    const { opened: employeeFormOpen } = useEmployeeParams();
    const { opened: contractorPayoutOpen } = useContractorPayoutParams();
    const { params: laborCostParams } = useLaborCostModal();

    return (
        <>
            {laborCostParams.laborCostModal ? (
                <SuperAdminGuard>
                    <LaborCostModal />
                </SuperAdminGuard>
            ) : null}
            {inboundStatusOpen ? <InboundSalesModal /> : null}
            {dispatchStatusOpen ? <DispatchStatusModal /> : null}
            {documentReviewOpen ? <DocumentReviewModal /> : null}
            {employeeFormOpen ? <EmployeeFormModal /> : null}
            {salesPreviewOpen ? <SalesPreviewModal /> : null}

            {createTemplate || !!templateId ? <CommunityTemplateModal /> : null}
            {createModelCost ? <CreateCommunityModelCostModal /> : null}
            {salesQuickPayParams.quickPaySalesId ? (
                <SalesQuickPayModal />
            ) : null}
            {editModelCostTemplateId ? <CommunityModelCostModal /> : null}
            {contractorPayoutOpen ? <ContractorPayoutOverviewModal /> : null}
            {/* <Env isDev> */}
            {openCustomerServiceId ? <WorkOrderFormModal /> : null}

            {/* LEGACY */}

            {!!editCommunityModelInstallCostId &&
            !openToSide &&
            !isCommunityUnit ? (
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
