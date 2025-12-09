import { CustomModal, CustomModalContent } from "./custom-modal";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { WorkOrderForm } from "../forms/work-order-form";
import { useQuery } from "@gnd/ui/tanstack";
import { useTRPC } from "@/trpc/client";

export function WorkOrderFormModal({}) {
    const { openCustomerServiceId, setParams } = useCustomerServiceParams();
    const opened = !!openCustomerServiceId;

    const trpc = useTRPC();
    const { data } = useQuery(
        trpc.community.workOrder.form.queryOptions(openCustomerServiceId, {
            enabled: openCustomerServiceId > 0,
        })
    );
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

