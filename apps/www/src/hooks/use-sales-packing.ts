import { useTRPC } from "@/trpc/client";
import { createContextFactory } from "@/utils/context-factory";
import { printSalesData } from "@/utils/sales-print-utils";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTaskTrigger } from "./use-task-trigger";
import { ResetSalesControl, UpdateSalesControl } from "@sales/schema";
import { useAuth } from "./use-auth";

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
        const onStartDispatch = () => {};
        const trigger = useTaskTrigger({
            onSucces() {
                qc.invalidateQueries({
                    queryKey: trpc.dispatch.dispatchOverview.queryKey(),
                });
            },
        });
        const onCompleteDispatch = () => {};
        const onDeleteDispatch = () => {};
        const onCancelDispatch = () => {};
        const onClearPacking = () => {
            trigger.trigger({
                taskName: "reset-sales-control",
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
        const onUnstartDispatch = () => {};
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
            packItemUid,
            setPackItemUid,
            isQueue,
            isInProgress,
            isCancelled,
            onStartDispatch,
            onDeleteDispatch,
            onCompleteDispatch,
            onCancelDispatch,
            onClearPacking,
            onUnstartDispatch,
            onPrintPacking,
            invalidate,
            trigger,
            onResetSalesStat,
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

