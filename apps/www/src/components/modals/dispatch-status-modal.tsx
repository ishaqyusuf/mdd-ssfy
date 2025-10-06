import { useInboundStatusModal } from "@/hooks/use-inbound-status-modal";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import FormSelect from "../common/controls/form-select";
import { inboundFilterStatus } from "@gnd/utils/constants";
import FormInput from "../common/controls/form-input";
import { Button } from "@gnd/ui/button";
import { z } from "zod";
import { useZodForm } from "@/hooks/use-zod-form";
import { saveInboundNoteSchema } from "@api/schemas/notes";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { useTRPC } from "@/trpc/client";
import { useEffect } from "react";
import { SubmitButton } from "../submit-button";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { InboundDocumentUploadZone } from "../sales-inbound/inbound-document-upload-zone";

import { useDispatchstatusModal } from "@/hooks/use-dispatch-status-modal";
import { AttachmentGallery } from "../attachment-gallery";

// get schema from zod input
const formSchema = saveInboundNoteSchema;
export function DispatchStatusModal({}) {
    const { params, isOpened, setParams } = useDispatchstatusModal();
    const form = useZodForm(formSchema, {
        defaultValues: {
            salesId: null,
            orderNo: "",
            status: "" as any,
            note: "",
            noteColor: "",
            attachments: [],
        },
    });
    const attachments = useFieldArray({
        control: form.control,
        name: "attachments",
        keyName: "_id",
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
            onError(e) {},
        }),
    );
    const statusList = inboundFilterStatus.filter((a) => a != "total");
    useEffect(() => {
        // if (params.inboundOrderId) {
        //     form.reset({
        //         salesId: params.inboundOrderId,
        //         orderNo: params.inboundOrderNo,
        //         status: "" as any,
        //         note: "",
        //     });
        // }
    }, [params]);
    if (!isOpened) return null;
    function onSubmit(values: z.infer<typeof formSchema>) {
        saveInboundStatus.mutate({
            ...values,
        });
    }
    return (
        <Dialog open={isOpened} onOpenChange={() => setParams(null)}>
            <DialogContent className="min-w-max   flex flex-col max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Update Order Inbound</DialogTitle>
                    <DialogDescription>
                        Update the inbound status for Order #
                        {/* {params.inboundOrderNo} */}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 relative overflow-auto">
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
                            <div className="flex gap-4">
                                <AttachmentGallery
                                    attachments={attachments.fields as any}
                                    onDelete={(data, index) => {
                                        attachments.remove(index);
                                    }}
                                />
                                <InboundDocumentUploadZone
                                    onUploadComplete={(e) => {
                                        e.map((a) => {
                                            attachments.append({
                                                pathname: a.pathname,
                                            });
                                        });
                                    }}
                                >
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            document
                                                .getElementById("upload-files")
                                                ?.click()
                                        }
                                    >
                                        Upload
                                    </Button>
                                </InboundDocumentUploadZone>
                            </div>
                            <DialogFooter className="flex justify-end gap-4">
                                {/* <Button
                                    variant="secondary"
                                    // action={updateAccount}
                                >
                                    Cancel
                                </Button> */}
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

                    {/* <div className="pt-[150px]">
                        <SalesPreview />
                    </div> */}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
