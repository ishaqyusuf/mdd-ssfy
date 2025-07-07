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
import { z } from "zod";
import { useZodForm } from "@/hooks/use-zod-form";
import { saveInboundNoteSchema } from "@api/schemas/notes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useEffect } from "react";
import { SubmitButton } from "../submit-button";

// get schema from zod input
const formSchema = saveInboundNoteSchema;
export function InboundSalesModal({}) {
    const { params, setParams } = useInboundStatusModal();
    const form = useZodForm(formSchema, {
        defaultValues: {
            salesId: null,
            orderNo: "",
            status: "" as any,
            note: "",
            noteColor: "",
        },
    });
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const saveInboundStatus = useMutation(
        trpc.notes.saveInboundNote.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey: trpc.sales.inboundSummary.queryKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.sales.inboundIndex.queryKey(),
                });
                setParams(null);
            },
            onError(e) {
                console.log(e);
            },
        }),
    );
    const statusList = inboundFilterStatus.filter((a) => a != "total");
    useEffect(() => {
        if (params.inboundOrderId) {
            form.reset({
                salesId: params.inboundOrderId,
                orderNo: params.inboundOrderNo,
                status: "" as any,
                note: "",
            });
        }
    }, [params]);
    if (!params.inboundOrderId) return null;
    function onSubmit(values: z.infer<typeof formSchema>) {
        saveInboundStatus.mutate({
            ...values,
        });
    }
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
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
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
                            <SubmitButton
                                type="submit"
                                isSubmitting={saveInboundStatus.isPending}
                                // action={updateAccount}
                            >
                                Update Status
                            </SubmitButton>
                        </DialogFooter>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}
