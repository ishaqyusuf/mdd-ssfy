import { useInboundStatusModal } from "@/hooks/use-inbound-status-modal";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { FormProvider, useForm } from "react-hook-form";
import FormSelect from "../common/controls/form-select";
import { inboundFilterStatus } from "@gnd/utils/constants";
import FormInput from "../common/controls/form-input";
import { Button } from "@gnd/ui/button";

export function InboundSalesModal({}) {
    const { params, setParams } = useInboundStatusModal();
    const form = useForm({
        defaultValues: {
            orderId: null,
            orderNo: "",
            status: "",
            note: "",
        },
    });
    if (!params.inboundOrderId) return null;
    const statusList = inboundFilterStatus.filter((a) => a != "total");
    return (
        <Dialog
            open={!!params.inboundOrderId}
            onOpenChange={() => setParams(null)}
        >
            <DialogContent className="min-w-max max-w-xl">
                <DialogHeader>
                    <DialogTitle>Update Order Inbound</DialogTitle>
                    <DialogDescription>
                        Update the inbound status for Order #
                        {params.inboundOrderNo}
                    </DialogDescription>
                </DialogHeader>
                <FormProvider {...form}>
                    <div className="">
                        <FormSelect
                            control={form.control}
                            options={statusList}
                            label="Status"
                            name="status"
                        />
                        <FormInput
                            control={form.control}
                            name="note"
                            label="Note"
                            type="textarea"
                            placeholder="Add Note about the inbound status"
                        />
                    </div>
                    <DialogFooter className="flex justify-end gap-4">
                        <Button
                            variant="secondary"
                            // action={updateAccount}
                        >
                            Cancel
                        </Button>
                        <Button
                        // action={updateAccount}
                        >
                            Update Status
                        </Button>
                    </DialogFooter>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}
