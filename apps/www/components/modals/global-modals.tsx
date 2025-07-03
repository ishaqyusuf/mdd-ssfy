"use client";

import { SuperAdminGuard } from "../auth-guard";
import { EmployeeFormModal } from "./employee-form-modal";
import { InboundSalesModal } from "./inbound-status-modal";
import { LaborCostModal } from "./labor-cost-modal";

export function GlobalModals() {
    return (
        <>
            <SuperAdminGuard>
                <LaborCostModal />
            </SuperAdminGuard>
            <InboundSalesModal />
            <EmployeeFormModal />
        </>
    );
}
