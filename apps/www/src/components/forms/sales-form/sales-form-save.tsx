import { triggerEvent } from "@/actions/events";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { updateSalesExtraCosts } from "@/actions/update-sales-extra-costs";
import {
    getSalesBookFormUseCase,
    saveFormUseCase,
} from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { zhInitializeState } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper";
import { Icons } from "@gnd/ui/icons";
import { Menu } from "@gnd/ui/custom/menu";
import Button from "@/components/common/button";
import { Button as UiButton } from "@gnd/ui/button";

import type { CreateSalesHistorySchemaTask } from "@jobs/schema";
import { toast } from "@gnd/ui/use-toast";
import { parseAsBoolean, useQueryStates } from "nuqs";
import { useRouter } from "next/navigation";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useTRPC } from "@/trpc/client";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useInStockStatusPrompt } from "./in-stock-status-dialog";

interface Props {
    type?: "button" | "menu";
    and?: "default" | "close" | "new";
    className?: string;
    iconOnly?: boolean;
}

export function SalesFormSave({ type = "button", and, className, iconOnly }: Props) {
    const [params] = useQueryStates({
        restoreMode: parseAsBoolean,
    });
    const zus = useFormDataStore();
    const router = useRouter();
    const sq = useSalesQueryClient();
    const trpc = useTRPC();
    const tsk = useTaskTrigger({
        silent: true,
    });
    const saveInboundStatus = useMutation(
        trpc.notes.saveInboundNote.mutationOptions(),
    );
    const [isSaving, setIsSaving] = useState(false);
    const [saveOptionsOpen, setSaveOptionsOpen] = useState(false);
    const [saveCountdown, setSaveCountdown] = useState(3);
    const saveLockRef = useRef(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );
    const { inStockStatusDialog, promptForInboundStatus } =
        useInStockStatusPrompt();
    async function save(action: "new" | "close" | "default" = "default") {
        if (saveLockRef.current || isSaving) return;
        setSaveOptionsOpen(false);
        saveLockRef.current = true;
        setIsSaving(true);
        const { kvFormItem, kvStepForm, metaData, sequence } = zus;
        const restoreMode = params.restoreMode;
        try {
            if (!metaData?.customer?.id) {
                toast({
                    title: "Customer required.",
                    variant: "destructive",
                });
                return;
            }
            const inboundStatus =
                metaData?.type === "order"
                    ? await promptForInboundStatus(metaData?.inventoryStatus)
                    : null;
            const shouldLogInboundStatus =
                !!inboundStatus && inboundStatus !== metaData?.inventoryStatus;
            const nextMetaData = inboundStatus
                ? {
                      ...metaData,
                      inventoryStatus: inboundStatus,
                  }
                : metaData;
            const resp = await saveFormUseCase(
                {
                    kvFormItem,
                    kvStepForm,
                    metaData: nextMetaData,
                    sequence,
                    saveAction: action,
                    newFeature: true,
                },
                zus.oldFormState,
                {
                    restoreMode,
                    allowRedirect: true,
                },
            );

            const s = resp?.data?.sales;
            tsk.triggerWithAuth("create-sales-history", {
                salesNo: resp.salesNo,
                salesType: resp.salesType,
            } as CreateSalesHistorySchemaTask);
            if (resp?.salesType === "order")
                void resetSalesStatAction(resp.salesId, resp?.salesNo).catch(
                    (error) => {
                        console.error("Unable to reset sales stats", error);
                    },
                );
            if (s?.updateId) triggerEvent("salesUpdated", s?.id);
            else triggerEvent("salesCreated", s?.id);
            const syncExtraCosts = updateSalesExtraCosts(
                resp.salesId,
                zus.metaData?.extraCosts,
            );
            sq?.invalidate.salesList();
            sq?.invalidate.quoteList();
            if (resp.salesId) zus.dotUpdate("metaData.id", resp.salesId);
            if (resp.salesNo) zus.dotUpdate("metaData.salesId", resp.salesNo);
            if (inboundStatus && resp.salesId && resp.salesNo) {
                zus.dotUpdate("metaData.inventoryStatus", inboundStatus);
            }
            if (shouldLogInboundStatus && inboundStatus && resp.salesId && resp.salesNo) {
                await saveInboundStatus.mutateAsync({
                    salesId: resp.salesId,
                    orderNo: resp.salesNo,
                    status: inboundStatus,
                    note: "Inbound status captured during order save.",
                });
            }
            const syncSavedForm = syncExtraCosts.then(() => {
                if (!metaData.debugMode) {
                    return (
                        refetchData({
                            salesNo: resp.salesNo,
                            salesId: resp.salesId,
                            type: resp.salesType || metaData.type,
                        })
                    );
                }
            });
            void syncSavedForm.catch((error) => {
                console.error("Unable to sync saved sales form", error);
            });
            if (!metaData.debugMode) {
                if (resp.data?.error)
                    toast({
                        variant: "destructive",
                        title: resp?.data?.error,
                    });
                else {
                    toast({
                        variant: "success",
                        title: "Saved",
                    });
                }
            }
            switch (action) {
                case "close":
                    router.push(`/sales-book/${metaData.type}s`);
                    break;
                case "default":
                    if (resp.redirectTo) {
                        router.push(resp.redirectTo);
                    } else router.refresh();
                    break;
                case "new":
                    router.push(`/sales-book/create-${metaData.type}`);
            }
        } finally {
            saveLockRef.current = false;
            setIsSaving(false);
        }
    }

    function clearSaveOptionTimers() {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    }

    function showSaveOptions() {
        if (isSaving) return;
        clearSaveOptionTimers();
        setSaveCountdown(3);
        setSaveOptionsOpen(true);
        countdownIntervalRef.current = setInterval(() => {
            setSaveCountdown((current) => Math.max(1, current - 1));
        }, 1000);
        saveTimeoutRef.current = setTimeout(() => {
            clearSaveOptionTimers();
            void save();
        }, 3000);
    }

    function chooseSaveOption(action: "close" | "default" | "new") {
        clearSaveOptionTimers();
        void save(action);
    }

    function cancelSaveOptions() {
        clearSaveOptionTimers();
        setSaveOptionsOpen(false);
    }

    useEffect(() => {
        return () => clearSaveOptionTimers();
    }, []);

    async function refetchData({
        salesNo,
        salesId,
        type,
    }: {
        salesNo?: string | number | null;
        salesId?: string | number | null;
        type?: string | null;
    }) {
        const slug = salesNo ?? zus.metaData.salesId ?? salesId;
        if (!slug) return;
        const data = await getSalesBookFormUseCase({
            type: (type ?? zus.metaData.type) as "order" | "quote",
            slug: String(slug),
        });
        zus.init(zhInitializeState(data));
    }
    const saveControl = type === "button" ? (
        <div className="relative flex items-center">
            <div
                className={[
                    "transition-all duration-200 ease-out",
                    saveOptionsOpen
                        ? "pointer-events-none w-0 scale-95 opacity-0"
                        : iconOnly
                          ? "w-8 scale-100 opacity-100"
                          : "w-auto scale-100 opacity-100",
                ].join(" ")}
            >
                <Button
                    icon="save"
                    size="sm"
                    type="button"
                    action={showSaveOptions}
                    variant="default"
                    disabled={isSaving}
                    className={className}
                    aria-label={iconOnly ? "Save" : undefined}
                    title={iconOnly ? "Save" : undefined}
                >
                    {iconOnly ? null : <span className="">Save</span>}
                </Button>
            </div>
            <div
                className={[
                    "flex items-center gap-1 overflow-hidden transition-all duration-200 ease-out",
                    saveOptionsOpen
                        ? "ml-1 max-w-[30rem] scale-100 opacity-100"
                        : "pointer-events-none ml-0 max-w-0 scale-95 opacity-0",
                ].join(" ")}
            >
                <UiButton
                    type="button"
                    size="sm"
                    disabled={isSaving}
                    className="h-8 rounded-full px-3 text-xs"
                    onClick={() => chooseSaveOption("default")}
                >
                    {isSaving ? "Saving..." : `Save (${saveCountdown})`}
                </UiButton>
                <UiButton
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSaving}
                    className="h-8 rounded-full px-3 text-xs"
                    onClick={() => chooseSaveOption("close")}
                >
                    Save & Close
                </UiButton>
                <UiButton
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSaving}
                    className="h-8 rounded-full px-3 text-xs"
                    onClick={() => chooseSaveOption("new")}
                >
                    Save & New
                </UiButton>
                <UiButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isSaving}
                    className="h-8 rounded-full px-3 text-xs"
                    onClick={cancelSaveOptions}
                >
                    Cancel
                </UiButton>
            </div>
        </div>
    ) : and ? (
        <Menu.Item Icon={Icons.save} onClick={(e) => save(and)} disabled={isSaving}>
            Save & {and}
        </Menu.Item>
    ) : (
        <>
            <Menu.Item Icon={Icons.save} onClick={(e) => save()} disabled={isSaving}>
                Save
            </Menu.Item>
            <Menu.Item
                Icon={Icons.save}
                disabled={isSaving}
                SubMenu={
                    <>
                        <Menu.Item
                            Icon={Icons.close}
                            disabled={isSaving}
                            onClick={() => save("close")}
                        >
                            Close
                        </Menu.Item>
                        <Menu.Item
                            Icon={Icons.add}
                            disabled={isSaving}
                            onClick={() => save("new")}
                        >
                            New
                        </Menu.Item>
                    </>
                }
            >
                Save &
            </Menu.Item>
        </>
    );

    return (
        <>
            {inStockStatusDialog}
            {saveControl}
        </>
    );
}
