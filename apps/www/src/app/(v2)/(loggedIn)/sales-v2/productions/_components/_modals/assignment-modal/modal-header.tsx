"use client";

import Modal from "@/components/common/modal";
import { AssignmentModalProps } from ".";

import useAssignmentActionsBuilder from "../../../use-assignment-actions-builder";

export default function ModalHeader({ order }: AssignmentModalProps) {
    const assignmentActions = useAssignmentActionsBuilder(order);
    return (
        <Modal.Header
            title="Production Assignment"
            subtitle={`${order.orderId} | ${
                order.customer?.businessName || order.customer?.name || ""
            }`}
        >
            <div className="flex-1"></div>
            <div className="mx-6 -mt-4 flex">
                <assignmentActions.GeneralAction />
            </div>
        </Modal.Header>
    );
}
