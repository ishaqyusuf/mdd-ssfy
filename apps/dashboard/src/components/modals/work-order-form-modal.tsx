import dynamic from "next/dynamic";
import { CustomModal, CustomModalContent } from "./custom-modal";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { useQuery } from "@gnd/ui/tanstack";
import { useTRPC } from "@/trpc/client";

const WorkOrderForm = dynamic(
	() => import("../forms/work-order-form").then((mod) => mod.WorkOrderForm),
);

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
            {opened ? (
                <CustomModalContent className="">
                    <WorkOrderForm data={data} />
                </CustomModalContent>
            ) : null}
        </CustomModal>
    );
}
