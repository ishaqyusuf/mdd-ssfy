import { useTRPC } from "@/trpc/client";
import { createContextFactory } from "@/utils/context-factory";
import { printSalesData } from "@/utils/sales-print-utils";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTaskTrigger } from "./use-task-trigger";
import {
    dispatchForm,
    ResetSalesControl,
    UpdateSalesControl,
} from "@sales/schema";
import { useAuth } from "./use-auth";
import { z } from "zod";
import { useNote } from "./use-note";
import { NoteTagTypes } from "@gnd/utils/constants";
import { toast } from "@gnd/ui/use-toast";

interface Props {
    data: RouterOutputs["dispatch"]["dispatchOverview"];
}
export const { Provider: PackingProvider, useContext: usePacking } =
    createContextFactory(({ data }: Props) => {
        const [packItemUid, setPackItemUid] = useState(null);
        const qc = useQueryClient();
        const trpc = useTRPC();
        const invalidate = () =>
            qc.invalidateQueries({
                queryKey: trpc.dispatch.dispatchOverview.queryKey(),
            });
        const isQueue = data?.dispatch?.status === "queue";
        const isInProgress = data?.dispatch?.status === "in progress";
        const isCancelled = data?.dispatch?.status === "cancelled";
        const [mainTab, setMainTab] = useState("main");
        const onStartDispatch = () => {
            startDispatch.mutate({
                meta: {
                    salesId: data?.order?.id,
                    authorId: auth?.id,
                    authorName: auth?.name,
                },
                startDispatch: {
                    dispatchId: data?.dispatch?.id,
                },
            });
        };
        const onCancelDispatch = () => {
            cancelDispatch.mutate({
                meta: {
                    salesId: data?.order?.id,
                    authorId: auth?.id,
                    authorName: auth?.name,
                },
                startDispatch: {
                    dispatchId: data?.dispatch?.id,
                },
            });
        };
        const note = useNote();
        const onSubmitDispatch = (formData: z.infer<typeof dispatchForm>) => {
            submitDispatch.mutate({
                meta: {
                    salesId: data?.order?.id,
                    authorId: auth?.id,
                    authorName: auth?.name,
                },
                submitDispatch: formData,
            });
        };
        const submitDispatch = useMutation(
            trpc.dispatch.submitDispatch.mutationOptions({
                async onSuccess(resp, input) {
                    const { submitDispatch, meta } = input as Exclude<
                        typeof input,
                        void
                    >;
                    invalidate();

                    toast({
                        title: "Sales Dispatch Completed",
                        variant: "success",
                        description: "Sales Dispatch Completed",
                    });

                    note.mutate(
                        {
                            headline: auth.name,
                            subject: `Sales Dispatch Completed`,
                            note: submitDispatch?.note,
                            tags: [
                                note.tag("signature", submitDispatch.signature),
                                note.tag("salesId", meta.salesId),
                                note.tag(
                                    "deliveryId",
                                    submitDispatch.dispatchId,
                                ),
                                note.tag("type", "dispatch" as NoteTagTypes),
                                ...submitDispatch?.attachments
                                    ?.filter((a) => a.pathname)
                                    ?.map((a) =>
                                        note.tag("attachment", a.pathname),
                                    ),
                            ],
                        },
                        {
                            onSuccess(data, variables, context) {
                                setMainTab("main");
                                toast({
                                    title: "Sales Dispatch Completed",
                                    variant: "success",
                                    description: "Sales Dispatch Completed",
                                });
                            },
                            onError(error, variables, context) {
                                toast({
                                    title: "Dispatch Note Failed",
                                    variant: "error",
                                    description: "Dispatch Note Failed",
                                });
                            },
                        },
                    );
                },
                onError(error, variables, context) {
                    toast({
                        title: "Dispatch Failed",
                        variant: "error",
                        description: "Dispatch Failed",
                    });
                },
            }),
        );
        const startDispatch = useMutation(
            trpc.dispatch.startDispatch.mutationOptions({
                onSuccess() {
                    invalidate();
                },
                onError(error, variables, context) {
                    console.log({ error });
                },
            }),
        );
        const cancelDispatch = useMutation(
            trpc.dispatch.cancelDispatch.mutationOptions({
                onSuccess() {
                    invalidate();
                },
                onError(error, variables, context) {
                    console.log({ error });
                },
            }),
        );
        const isStarting = startDispatch.isPending;
        const trigger = useTaskTrigger({
            onSucces() {
                qc.invalidateQueries({
                    queryKey: trpc.dispatch.dispatchOverview.queryKey(),
                });
            },
        });
        const onCompleteDispatch = () => {};
        const onDeleteDispatch = () => {};
        const onClearPacking = () => {
            trigger.trigger({
                taskName: "update-sales-control",
                payload: {
                    meta: {
                        authorId: auth.id,
                        salesId: data?.order?.id,
                        authorName: auth.name,
                    },
                    clearPackings: {
                        dispatchId: data?.dispatch.id,
                    },
                } as UpdateSalesControl,
            });
        };
        const auth = useAuth();
        const onResetSalesStat = () => {
            trigger.trigger({
                taskName: "reset-sales-control",
                payload: {
                    meta: {
                        authorId: auth.id,
                        salesId: data?.order?.id,
                        authorName: auth.name,
                    },
                } as ResetSalesControl,
            });
        };
        const onUnstartDispatch = () => {
            cancelDispatch;
        };
        const onPrintPacking = () => {
            printSalesData({
                mode: "packing list",
                dispatchId: data?.dispatch.id,
                preview: false,
                // slugs: ctx?.data?.order?.orderId,
                slugs: data?.order?.orderId,
            });
        };
        return {
            data,
            isStarting,
            packItemUid,
            setPackItemUid,
            isQueue,
            isInProgress,
            isCancelled,
            onStartDispatch,
            onDeleteDispatch,
            onCompleteDispatch,
            onUnstartDispatch,
            onCancelDispatch,
            onClearPacking,
            onPrintPacking,
            invalidate,
            trigger,
            onResetSalesStat,
            mainTab,
            setMainTab,
            onSubmitDispatch,
            submitDispatch,
        };
    });
export const { Provider: PackingItemProvider, useContext: usePackingItem } =
    createContextFactory(
        ({ item }: { item: Props["data"]["dispatchItems"][number] }) => {
            return {
                item,
            };
        },
    );

