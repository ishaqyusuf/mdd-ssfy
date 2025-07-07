"use client";

import { useStaticProducers } from "@/_v2/hooks/use-static-data";
import Modal from "@/components/common/modal";
import { useModal } from "@/components/common/modal/provider";
import { toast } from "sonner";

import { Table, TableBody, TableCell, TableRow } from "@gnd/ui/table";

import {
    assignAllAction,
    markAsSubmittedAction,
} from "../../../_actions/production-batch-actions";
import { AssignmentModalProps } from "../assignment-modal";
import { useAssignment } from "../assignment-modal/use-assignment";

interface Props {
    orderId;
    itemsId?: Number[];
    order?: AssignmentModalProps["order"];
    action: "assign" | "submitted";
}
export default function SelectItemsCompletedBy({
    orderId,
    itemsId,
    action,
    order,
}: Props) {
    const prodUsers = useStaticProducers();
    const modal = useModal();
    const assignmentModal = useAssignment();
    async function submit(userId) {
        let resp;
        try {
            switch (action) {
                case "assign":
                    let resp = await assignAllAction({ orderId, userId });
                    if ((resp.assigned = 0)) toast.error("Nothing to Assign");
                    toast.success("Assignments completed");
                    break;
                case "submitted":
                    let resp_ = await markAsSubmittedAction({
                        orderId,
                        userId,
                    });
                    toast.message("All marked as submitted");
                    break;
            }
            assignmentModal.open(orderId);
        } catch (error) {
            if (error instanceof Error) toast.error(error.message);
        }
    }
    const title = {
        assign: "Assign To:",
        submitted: "Production Completed By:",
    }[action];
    return (
        <Modal.Content size={"md"}>
            <Modal.Header title={title} />
            <Table>
                <TableBody>
                    {[
                        {
                            id: -1,
                            name: "Continue anyaway",
                        },
                        ...(prodUsers.data || []),
                    ]?.map((user) => (
                        <TableRow
                            onClick={() => {
                                submit(user.id);
                            }}
                            className="cursor-default"
                            key={user.id}
                        >
                            <TableCell>{user.name}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Modal.Content>
    );
}
