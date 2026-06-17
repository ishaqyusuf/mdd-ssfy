import { useInboundStatusModal } from "@/hooks/use-inbound-status-modal";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { FormProvider, useFieldArray } from "react-hook-form";
import FormSelect from "../common/controls/form-select";
import { orderInboundStatuses } from "@gnd/utils/constants";
import FormInput from "../common/controls/form-input";
import { Button } from "@gnd/ui/button";
import { z } from "zod";
import { useZodForm } from "@/hooks/use-zod-form";
import { saveInboundNoteSchema } from "@api/schemas/notes";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { useTRPC } from "@/trpc/client";
import { useEffect } from "react";
import { SubmitButton } from "../submit-button";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { del } from "@vercel/blob";
import { InboundDocumentUploadZone } from "../sales-inbound/inbound-document-upload-zone";
import Image from "next/image";
import { env } from "@/env.mjs";
import ConfirmBtn from "../confirm-button";
import { toast } from "@gnd/ui/use-toast";
import {
    InboundDemandSelection,
    isPromptMutableDemand,
} from "./inbound-demand-selection";

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
            demandIds: [],
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
    const demandRowsQuery = useQuery(
        trpc.inventories.inboundDemandQueue.queryOptions(
            {
                saleId: params.inboundOrderId ?? 0,
                status: ["pending", "ordered", "partially_received"],
            },
            {
                enabled: !!params.inboundOrderId && !!params.updateInboundStatus,
                refetchOnWindowFocus: false,
                staleTime: 60 * 1000,
            },
        ),
    );
    const demandRows = demandRowsQuery.data ?? [];
    const selectedStatus = form.watch("status");
    const selectedDemandIds = form.watch("demandIds") ?? [];
    const saveInboundStatus = useMutation(
        trpc.notes.saveInboundNote.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries({
                    queryKey: trpc.sales.getOrders.pathKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.sales.getSaleOverview.pathKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.sales.inboundSummary.queryKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.sales.inboundIndex.queryKey(),
                });
                queryClient.invalidateQueries({
                    queryKey: trpc.inventories.inboundDemandQueue.pathKey(),
                });
                queryClient.invalidateQueries({
                    queryKey:
                        trpc.inventories.inboundStatusDemandReconciliation.pathKey(),
                });
                toast({
                    title: "Inbound status updated.",
                    variant: "success",
                });
                setParams(null);
            },
            onError(e) {},
        }),
    );
    const statusList = [...orderInboundStatuses];
    useEffect(() => {
        if (params.inboundOrderId) {
            form.reset({
                salesId: params.inboundOrderId,
                orderNo: params.inboundOrderNo,
                status: (params.inboundOrderStatus || "") as any,
                note: "",
                demandIds: [],
            });
        }
    }, [params]);
    useEffect(() => {
        const nextDemandIds = selectedDemandIds.filter((demandId) =>
            demandRows.some(
                (demand) =>
                    demand.id === demandId &&
                    isPromptMutableDemand(demand, selectedStatus),
            ),
        );

        if (nextDemandIds.length === selectedDemandIds.length) return;

        form.setValue("demandIds", nextDemandIds, {
            shouldDirty: true,
        });
    }, [demandRows, form, selectedDemandIds, selectedStatus]);
    if (!params.inboundOrderId) return null;
    function onSubmit(values: z.infer<typeof formSchema>) {
        saveInboundStatus.mutate({
            ...values,
        });
    }
    function toggleDemandSelection(demandId: number, checked: boolean) {
        const nextDemandIds = checked
            ? Array.from(new Set([...selectedDemandIds, demandId]))
            : selectedDemandIds.filter((id) => id !== demandId);

        form.setValue("demandIds", nextDemandIds, {
            shouldDirty: true,
        });
    }
    return (
        <Dialog
            open={!!params.inboundOrderId && params.updateInboundStatus}
            onOpenChange={() =>
                setParams({
                    updateInboundStatus: null,
                })
            }
        >
            <DialogContent className="min-w-max   flex flex-col max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Update Order Inbound</DialogTitle>
                    <DialogDescription>
                        Update the inbound status for Order #
                        {params.inboundOrderNo}
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
                            <InboundDemandSelection
                                rows={demandRows}
                                selectedStatus={selectedStatus}
                                selectedDemandIds={selectedDemandIds}
                                onSelectionChange={toggleDemandSelection}
                            />
                            <div className="flex gap-4">
                                {attachments.fields.map((a, ai) => (
                                    <div key={a._id}>
                                        <Image
                                            src={`${env.NEXT_PUBLIC_VERCEL_BLOB_URL}/${a.pathname}`}
                                            alt={a.pathname}
                                            width={75}
                                            height={75}
                                        />
                                        <div className="flex gap-4">
                                            <ConfirmBtn
                                                trash
                                                onClick={(e) => {
                                                    del(a.pathname)
                                                        .then((e) => {
                                                            attachments.remove(
                                                                ai,
                                                            );
                                                        })
                                                        .catch((e) => {});
                                                }}
                                                type="button"
                                            />
                                        </div>
                                    </div>
                                ))}
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
