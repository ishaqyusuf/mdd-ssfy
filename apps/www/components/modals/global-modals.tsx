"use client";

import { SuperAdminGuard } from "../auth-guard";
import { LaborCostModal } from "./labor-cost-modal";

export function GlobalModals() {
    return (
        <>
            <SuperAdminGuard>
                <LaborCostModal />
            </SuperAdminGuard>
        </>
    );
}
