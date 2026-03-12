import { useTRPC } from "@/trpc/client";
import createContextFactory from "@/utils/context-factory";
import { printSalesData } from "@/utils/sales-print-utils";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { useState } from "react";
import { useTaskTrigger } from "./use-task-trigger";
import {
    dispatchForm,
    ResetSalesControl,
    UpdateSalesControl,
} from "@sales/schema";
import { useAuth } from "./use-auth";
import { z } from "zod";
import { toast } from "@gnd/ui/use-toast";

interface Props {
    data: any;
}
export const { Provider: PackingProvider, useContext: usePacking } =
    createContextFactory(({ data }: Props) => {
        const [packItemUid, setPackItemUid] = useState(null);
        const qc = useQueryClient();
        const trpc = useTRPC();
        const invalidate = () =>
            Promise.all([
                qc.invalidateQueries({
                    queryKey: trpc.dispatch.dispatchOverview.queryKey(),
                }),
                qc.invalidateQueries({
                    queryKey: trpc.dispatch.dispatchOverviewV2.queryKey(),
                }),
            ]);
        const isQueue = data?.dispatch?.status === "queue";
        const isInProgress = data?.dispatch?.status === "in progress";
        const isCancelled = data?.dispatch?.status === "cancelled";
        const auth = useAuth();
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
                    invalidate();
                    qc.invalidateQueries({
                        queryKey: trpc.dispatch.index.pathKey(),
                    });
                    qc.invalidateQueries({
                        queryKey: trpc.dispatch.assignedDispatch.pathKey(),
                    });
                    toast({
                        title: "Sales Dispatch Completed",
                        variant: "success",
                        description: "Sales Dispatch Completed",
                    });
                    setMainTab("main");
                },
                onError(error, variables, context) {
                    console.log({
                        error,
                        variables,
                    });
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
            debug: true,
            onSuccess() {
                qc.invalidateQueries({
                    queryKey: trpc.dispatch.dispatchOverview.queryKey(),
                });
                qc.invalidateQueries({
                    queryKey: trpc.dispatch.dispatchOverviewV2.queryKey(),
                });
            },
        });
        const completeAllTrigger = useTaskTrigger({
            onStarted() {
                submitDispatch.mutate({
                    meta: {
                        salesId: Number(data?.order?.id || 0),
                        authorId: Number(auth?.id || 0),
                        authorName: auth?.name || "System",
                    },
                    submitDispatch: {
                        dispatchId: Number(data?.dispatch?.id || 0),
                        receivedBy: auth?.name || "System",
                        receivedDate: new Date(),
                    },
                });
            },
        });
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
        const onPackDispatch = (packMode: "available" | "all") => {
            trigger.trigger({
                taskName: "update-sales-control",
                payload: {
                    meta: {
                        authorId: Number(auth.id || 0),
                        salesId: Number(data?.order?.id || 0),
                        authorName: auth.name || "System",
                    },
                    packItems: {
                        dispatchId: Number(data?.dispatch?.id || 0),
                        dispatchStatus: data?.dispatch?.status || "queue",
                        packMode,
                        replaceExisting: true,
                    },
                } as UpdateSalesControl,
            });
        };
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
            cancelDispatch.mutate({
                meta: {
                    salesId: data?.order?.id,
                    authorId: auth?.id,
                    authorName: auth?.name,
                },
                cancelDispatch: {
                    dispatchId: data?.dispatch.id,
                },
            });
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
        const onCompleteDispatch = (mode: "packed_only" | "pack_all") => {
            if (mode === "pack_all") {
                completeAllTrigger.trigger({
                    taskName: "update-sales-control",
                    payload: {
                        meta: {
                            authorId: Number(auth.id || 0),
                            salesId: Number(data?.order?.id || 0),
                            authorName: auth.name || "System",
                        },
                        packItems: {
                            dispatchId: Number(data?.dispatch?.id || 0),
                            dispatchStatus: "completed",
                            packMode: "all",
                            replaceExisting: true,
                        },
                    } as UpdateSalesControl,
                });
                return;
            }
            submitDispatch.mutate({
                meta: {
                    salesId: Number(data?.order?.id || 0),
                    authorId: Number(auth?.id || 0),
                    authorName: auth?.name || "System",
                },
                submitDispatch: {
                    dispatchId: Number(data?.dispatch?.id || 0),
                    receivedBy: auth?.name || "System",
                    receivedDate: new Date(),
                },
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
            isCancelling: cancelDispatch.isPending,
            isCompleting:
                submitDispatch.isPending || completeAllTrigger.isActionPending,
            onStartDispatch,
            onDeleteDispatch,
            onCompleteDispatch,
            onUnstartDispatch,
            onCancelDispatch,
            onClearPacking,
            onPackDispatch,
            onPrintPacking,
            invalidate,
            trigger,
            completeAllTrigger,
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
