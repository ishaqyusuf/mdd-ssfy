"use client";

import { useEffect, useMemo } from "react";
import { toast } from "@gnd/ui/use-toast";
import { Button } from "@gnd/ui/button";
import { useNewSalesFormStore } from "./store";
import { toSaveDraftInput } from "./mappers";
import {
    useNewSalesFormBootstrapQuery,
    useNewSalesFormGetQuery,
    useSaveFinalNewSalesFormMutation,
} from "./api";
import { useNewSalesFormAutoSave } from "./use-auto-save";
import { HeaderActions } from "./sections/header-actions";
import { ItemWorkflowPanel } from "./sections/item-workflow-panel";
import { InvoiceSummarySidebar } from "./sections/invoice-summary-sidebar";
import { useRouter } from "next/navigation";
import { _modal } from "@/components/common/modal/provider";
import NewSalesFormSettingsModal from "@/components/modals/new-sales-form-settings-modal";

interface Props {
    mode: "create" | "edit";
    type: "order" | "quote";
    slug?: string;
}

function currency(value?: number | null) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(Number(value || 0));
}

export function NewSalesForm(props: Props) {
    const router = useRouter();
    const record = useNewSalesFormStore((s) => s.record);
    const dirty = useNewSalesFormStore((s) => s.dirty);
    const saveStatus = useNewSalesFormStore((s) => s.saveStatus);
    const lastSavedAt = useNewSalesFormStore((s) => s.lastSavedAt);
    const lastSaveError = useNewSalesFormStore((s) => s.lastSaveError);
    const hydrate = useNewSalesFormStore((s) => s.hydrate);
    const addLineItem = useNewSalesFormStore((s) => s.addLineItem);
    const markSaving = useNewSalesFormStore((s) => s.markSaving);
    const markSaved = useNewSalesFormStore((s) => s.markSaved);
    const markError = useNewSalesFormStore((s) => s.markError);
    const markStale = useNewSalesFormStore((s) => s.markStale);
    const patchRecord = useNewSalesFormStore((s) => s.patchRecord);
    const editor = useNewSalesFormStore((s) => s.editor);
    const setEditor = useNewSalesFormStore((s) => s.setEditor);

    const bootstrapQuery = useNewSalesFormBootstrapQuery(
        {
            type: props.type,
            customerId: null,
        },
        props.mode === "create",
    );
    const getQuery = useNewSalesFormGetQuery(
        {
            type: props.type,
            slug: props.slug || "",
        },
        props.mode === "edit" && !!props.slug,
    );

    const loadData = props.mode === "create" ? bootstrapQuery.data : getQuery.data;
    const isLoading =
        props.mode === "create" ? bootstrapQuery.isPending : getQuery.isPending;
    const loadError = props.mode === "create" ? bootstrapQuery.error : getQuery.error;

    useEffect(() => {
        if (!loadData) return;
        const shouldHydrate =
            !record ||
            record.version !== loadData.version ||
            record.salesId !== loadData.salesId;
        if (shouldHydrate) hydrate(loadData);
    }, [loadData, hydrate, record]);

    const payload = useMemo(() => {
        if (!record) return null;
        return toSaveDraftInput(record, true);
    }, [record]);

    const autosave = useNewSalesFormAutoSave({
        enabled: !!record && editor.autosaveEnabled,
        dirty,
        payload,
        onSaving: () => {
            markSaving();
        },
        onSaved: (resp) => {
            patchRecord({
                salesId: resp?.salesId,
                slug: resp?.slug,
                orderId: resp?.orderId,
                status: resp?.status,
            });
            markSaved({
                version: resp?.version,
                updatedAt: resp?.updatedAt || new Date().toISOString(),
            });
        },
        onStale: (error) => {
            markStale((error as any)?.message || "Version conflict detected.");
            toast({
                title: "This form is out of date",
                description: "Reload latest data before continuing.",
                variant: "destructive",
            });
        },
        onError: (error) => {
            markError((error as any)?.message || "Autosave failed.");
        },
    });

    const finalSave = useSaveFinalNewSalesFormMutation();

    function validateBeforeSave() {
        if (!record?.form.customerId) {
            toast({
                title: "Customer required",
                description: "Select a customer before saving.",
                variant: "destructive",
            });
            return false;
        }
        if (!record?.lineItems?.length) {
            toast({
                title: "Line item required",
                description: "Add at least one line item before saving.",
                variant: "destructive",
            });
            return false;
        }
        return true;
    }

    async function saveDraftNow() {
        if (!validateBeforeSave()) return;
        markSaving();
        const resp = await autosave.flush();
        if (!resp) {
            markError("Unable to save draft.");
            return;
        }
        toast({
            title: "Draft saved",
            variant: "success",
        });
    }

    async function saveFinal() {
        if (!record) return;
        if (!validateBeforeSave()) return;
        markSaving();
        const payload = toSaveDraftInput(record, false);
        try {
            const resp = await finalSave.mutateAsync({
                ...payload,
                autosave: false,
            });
            patchRecord({
                salesId: resp?.salesId,
                slug: resp?.slug,
                orderId: resp?.orderId,
                status: resp?.status,
            });
            markSaved({
                version: resp?.version,
                updatedAt: resp?.updatedAt || new Date().toISOString(),
            });
            toast({
                title: "Saved",
                description: `${props.type} ${resp?.orderId} has been finalized.`,
                variant: "success",
            });
        } catch (error) {
            const err = error as any;
            if (String(err?.message || "").toLowerCase().includes("out of date")) {
                markStale(err?.message);
            } else markError(err?.message || "Unable to save.");
            toast({
                title: "Save failed",
                description: err?.message || "Unable to save final form.",
                variant: "destructive",
            });
        }
    }

    async function saveClose() {
        if (!validateBeforeSave()) return;
        if (dirty) {
            const resp = await autosave.flush("manual-flush");
            if (!resp) return;
        }
        router.push(`/sales-book/${props.type === "order" ? "orders" : "quotes"}`);
    }

    async function saveNew() {
        if (!validateBeforeSave()) return;
        if (dirty) {
            const resp = await autosave.flush("manual-flush");
            if (!resp) return;
        }
        router.push(
            `/sales-form/${props.type === "order" ? "create-order" : "create-quote"}`,
        );
    }

    if (isLoading || !record) {
        return (
            <div className="rounded-lg border p-8 text-sm text-muted-foreground">
                Loading sales form...
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                <p>Unable to load sales form.</p>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        if (props.mode === "create") bootstrapQuery.refetch();
                        else getQuery.refetch();
                    }}
                >
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="relative flex h-[calc(100dvh-var(--header-height,5rem))] max-h-[calc(100dvh-var(--header-height,5rem))] overflow-hidden rounded-xl border bg-background">
            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <HeaderActions
                    type={props.type}
                    orderId={record.orderId}
                    isSaving={autosave.isSaving || finalSave.isPending}
                    saveStatus={saveStatus}
                    dirty={dirty}
                    lastSavedAt={lastSavedAt}
                    statusMessage={lastSaveError}
                    isOverviewOpen={editor.isOverviewOpen}
                    autosaveEnabled={editor.autosaveEnabled}
                    onSaveDraft={saveDraftNow}
                    onSaveFinal={saveFinal}
                    onSaveClose={saveClose}
                    onSaveNew={saveNew}
                    onAddLineItem={() => addLineItem()}
                    onToggleOverview={() =>
                        setEditor({
                            showMobileSummary: !editor.showMobileSummary,
                        })
                    }
                    onOpenMobileSummary={() =>
                        setEditor({
                            showMobileSummary: !editor.showMobileSummary,
                        })
                    }
                    onToggleAutosave={() =>
                        setEditor({
                            autosaveEnabled: !editor.autosaveEnabled,
                        })
                    }
                    onOpenSettings={() => {
                        _modal.openSheet(<NewSalesFormSettingsModal />);
                    }}
                />

                <div className="flex-1 overflow-y-auto p-4 pb-28 sm:p-6 lg:p-8 lg:pb-8">
                    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
                        <ItemWorkflowPanel />
                    </div>
                </div>
            </main>

            <InvoiceSummarySidebar
                mobileOpen={editor.showMobileSummary}
                onClose={() =>
                    setEditor({
                        showMobileSummary: false,
                    })
                }
            />

            <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card p-3 shadow-[0_-4px_18px_rgba(0,0,0,0.08)] lg:hidden">
                <div className="mx-auto flex w-full max-w-lg items-center gap-3">
                    <button
                        type="button"
                        className="flex flex-1 flex-col items-start"
                        onClick={() =>
                            setEditor({
                                showMobileSummary: true,
                            })
                        }
                    >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Review Totals
                        </span>
                        <span className="text-lg font-bold text-foreground">
                            {currency(record.summary.grandTotal)}
                        </span>
                    </button>
                    <Button
                        className="h-11 px-4"
                        onClick={() => void saveFinal()}
                        disabled={autosave.isSaving || finalSave.isPending}
                    >
                        Finalize
                    </Button>
                </div>
            </div>
        </div>
    );
}
