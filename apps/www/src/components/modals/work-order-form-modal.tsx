import { CustomModal, CustomModalContent } from "./custom-modal";
import { useWorkOrderParams } from "@/hooks/use-work-order-params";
import { WorkOrderForm } from "../forms/work-order-form";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useDebugToast } from "@/hooks/use-debug-console";

export function WorkOrderFormModal({}) {
    const { editWorkOrderId, setParams } = useWorkOrderParams();
    const opened = !!editWorkOrderId;

    const trpc = useTRPC();
    const { data } = useQuery(
        trpc.community.workOrder.form.queryOptions(editWorkOrderId, {
            enabled: editWorkOrderId > 0,
        }),
    );
    // useDebugToast("Work order form data", data);
    return (
        <CustomModal
            className=" "
            size="2xl"
            title="Work Order"
            open={opened}
            height="lg"
            onOpenChange={(e) => {
                setParams(null);
            }}
        >
            <CustomModalContent className="">
                <WorkOrderForm data={data} />
            </CustomModalContent>
        </CustomModal>
    );
}

