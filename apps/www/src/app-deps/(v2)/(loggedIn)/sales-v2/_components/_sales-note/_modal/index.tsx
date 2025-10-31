"use client";

import Modal from "@/components/common/modal";
import { useModal } from "@/components/common/modal/provider";
import SalesNotes from "..";

interface Props {
    id;
    orderId;
    edit?: boolean;
}
export default function SalesNoteModal({ id, orderId, edit }: Props) {
    const modal = useModal();
    return (
        <Modal.Content>
            <Modal.Header title="Notes" subtitle={orderId} />
            <SalesNotes salesId={id} edit={edit} />
        </Modal.Content>
    );
}
