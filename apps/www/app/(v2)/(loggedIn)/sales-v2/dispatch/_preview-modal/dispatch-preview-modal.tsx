"use client";

import { useDataPage } from "@/lib/data-page-context";
import Modal from "@/components/common/modal";
import { GetOrderAssignmentData } from "../../productions/_components/_modals/assignment-modal/_action/get-order-assignment-data";

export type OrderAssignmentData = GetOrderAssignmentData;
export const useData = () => useDataPage<OrderAssignmentData>();

export default function DispatchPreviewModal() {
    return (
        <Modal.Content size="xl">
            <Modal.Header title="Dispatch Preview" />
        </Modal.Content>
    );
}
