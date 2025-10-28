"use client";

import { SuperAdminGuard } from "../auth-guard";
import { CommunityModelCostModal } from "./community-model-cost-modal";
import { CommunityTemplateModal } from "./community-template-modal";
import { CreateCommunityModelCostModal } from "./create-community-model-cost-modal";
import { DispatchStatusModal } from "./dispatch-status-modal";
import { EmployeeFormModal } from "./employee-form-modal";
import { InboundSalesModal } from "./inbound-status-modal";
import { LaborCostModal } from "./labor-cost-modal";
import { SalesEmailSenderModal } from "./sales-email-sender";
import { SalesInvoicePreviewModal } from "./sales-invoice-preview-modal";
import { SalesPreviewModal } from "./sales-preview-modal";
import { SalesQuickPayModal } from "./sales-quick-pay-modal";
import { WorkOrderFormModal } from "./work-order-form-modal";
import ModelInstallCostModal from "@/app/(v1)/(loggedIn)/settings/community/community-templates/install-cost-modal/model-install-cost-modal";
import CommunityInstallCostModal from "@/components/_v1/modals/community-install-cost";
export function GlobalModals() {
    return (
        <>
            <SuperAdminGuard>
                <LaborCostModal />
            </SuperAdminGuard>
            <InboundSalesModal />
            <DispatchStatusModal />
            <EmployeeFormModal />
            <SalesPreviewModal />
            <SalesEmailSenderModal />
            <CommunityTemplateModal />
            <CreateCommunityModelCostModal />
            <SalesInvoicePreviewModal />
            <SalesQuickPayModal />
            <CommunityModelCostModal />
            {/* <Env isDev> */}
            <WorkOrderFormModal />

            {/* LEGACY */}

            <CommunityInstallCostModal />

            {/* </Env> */}
        </>
    );
}
