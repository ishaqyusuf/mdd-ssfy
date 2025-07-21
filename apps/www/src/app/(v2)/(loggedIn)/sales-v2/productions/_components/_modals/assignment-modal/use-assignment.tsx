import { _modal, useModal } from "@/components/common/modal/provider";
import AssignmentModal, { useAssignmentData } from ".";
import { getOrderAssignmentData } from "./_action/get-order-assignment-data";
import { _revalidate } from "@/app/(v1)/_actions/_revalidate";

interface Props {
    // prod?: boolean;
    type?: "prod" | "dispatch" | undefined;
    // dispatch?: boolean
}
export function useAssignment({ type }: Props = {}) {
    const modal = useModal();
    const data = useAssignmentData();
    async function __open(id) {
        const mode = {
            prod: type == "prod",
            dispatch: type == "dispatch",
        };
        const data = await getOrderAssignmentData(id, mode);

        modal.openModal(<AssignmentModal order={data} />);
    }
    function open(id) {}
    return {
        async revalidate() {},
        open,
        refresh() {
            __open(data.data.id);
        },
    };
}
