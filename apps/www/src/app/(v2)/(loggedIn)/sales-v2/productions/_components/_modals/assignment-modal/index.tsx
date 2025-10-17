"use client";

import Modal from "@/components/common/modal";
import { GetOrderAssignmentData } from "./_action/get-order-assignment-data";
import { DataPageShell } from "@/components/_v1/shells/data-page-shell";
import { useDataPage } from "@/lib/data-page-context";
import SectionedItems from "./sectioned-items";
import ModalHeader from "./modal-header";

export type OrderAssignmentDataGroup = GetOrderAssignmentData["doorGroups"][0];
export type OrderAssignmentSalesDoor =
    OrderAssignmentDataGroup["salesDoors"][0];
export interface AssignmentModalProps {
    order: GetOrderAssignmentData;
}

export const useAssignmentData = () => useDataPage<GetOrderAssignmentData>();
export default function AssignmentModal({ order }: AssignmentModalProps) {
    return (
        <Modal.Content size={"xl"} className="">
            <DataPageShell data={order}>
                <ModalHeader order={order} />
                <div
                    id="assignmentModal"
                    className="overflow-auto  max-h-[80vh] pr-2 -mr-6 spb-28"
                >
                    {order.doorGroups.map((group, index) => (
                        <SectionedItems index={index} key={index} />
                    ))}
                </div>
            </DataPageShell>
        </Modal.Content>
    );
}
