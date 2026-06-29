"use client";

import { triggerEvent } from "@/actions/events";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { updateSalesMetaAction } from "@/actions/update-sales-meta-action";
import { Env } from "@/components/env";
import { SalesMenu } from "@/components/sales-menu";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { env } from "@/env.mjs";
import { useAuth } from "@/hooks/use-auth";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useSalesPrintController } from "@/modules/sales-print/application/use-sales-print-controller";
import { useTRPC } from "@/trpc/client";
import {
    SalesFormFloatingActions,
    SalesFormHeaderActions,
    SalesFormShell,
    normalizeSalesFormInitialCustomerId,
} from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import { DropdownMenuItem } from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import type { CreateSalesHistorySchemaTask } from "@jobs/schema";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
    type MouseEvent as ReactMouseEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { SalesFormDevSwitcher } from "../sales-form-dev-switcher";
import { useSalesInventoryConfiguratorPrompt } from "../sales-form/inventory-configurator-dialog";
import { PaymentMethodReviewDialog } from "../sales-form/payment-method-review-dialog";
import { useSalesFormCapabilities } from "./adapters/use-sales-form-capabilities";
import { useSalesFormPermissions } from "./adapters/use-sales-form-permissions";
import {
    useNewSalesFormBootstrapQuery,
    useNewSalesFormGetQuery,
    useSaveFinalNewSalesFormMutation,
} from "./api";
import {
    type NewSalesFormRecoverySnapshot,
    clearRecoverySnapshot,
    createPayloadFingerprint,
    getRecoveryStorageKey,
    readRecoverySnapshot,
    writeRecoverySnapshot,
} from "./local-recovery";
import { toSaveDraftInput } from "./mappers";
import type { NewSalesFormRecord } from "./schema";
import { CustomerSelectorDialog } from "./sections/customer-selector-dialog";
import { useNewSalesFormStore } from "./store";
import { useNewSalesFormAutoSave } from "./use-auto-save";
import { useCreateFormQueryParams } from "./use-create-form-query-params";

interface Props {
    mode: "create" | "edit";
    type: "order" | "quote";
    slug?: string;
}

const ItemWorkflowPanel = dynamic(
    () =>
        import("./sections/item-workflow-panel").then(
            (mod) => mod.ItemWorkflowPanel,
        ),
    {
        loading: () => <WorkflowPanelSkeleton />,
    },
);

const WwwSalesFormWorkflowPanel = dynamic(
    () =>
        import("./sections/www-sales-form-workflow-panel").then(
            (mod) => mod.WwwSalesFormWorkflowPanel,
        ),
    {
        loading: () => <WorkflowPanelSkeleton />,
    },
);

const NewSalesFormSettingsModal = dynamic(
    () => import("@/components/modals/new-sales-form-settings-modal"),
    {
        ssr: false,
    },
);

const SalesHistory = dynamic(
    () => import("@/components/sales-hx").then((mod) => mod.SalesHistory),
    {
        loading: () => (
            <div className="space-y-3">
                <div className="h-10 w-full animate-pulse rounded bg-muted" />
                <div className="h-20 w-full animate-pulse rounded bg-muted" />
                <div className="h-20 w-full animate-pulse rounded bg-muted" />
            </div>
        ),
    },
);

const InvoiceOverviewPanel = dynamic(
    () =>
        import("./sections/invoice-overview-panel").then(
            (mod) => mod.InvoiceOverviewPanel,
        ),
    {
        loading: () => (
            <div className="space-y-3">
                <div className="h-10 w-full animate-pulse rounded bg-muted" />
                <div className="h-32 w-full animate-pulse rounded bg-muted" />
                <div className="h-24 w-full animate-pulse rounded bg-muted" />
            </div>
        ),
    },
);

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

const PACKAGE_WORKFLOW_PANEL_STORAGE_KEY =
    "gnd:new-sales-form:package-workflow-panel";

function resolveInitialPackageWorkflowPanelEnabled() {
    const envDefault =
        env.NEXT_PUBLIC_NEW_SALES_FORM_PACKAGE_PANEL_DEFAULT === "package";
    if (typeof window === "undefined") return envDefault;

    const param = new URLSearchParams(window.location.search).get(
        "packageWorkflowPanel",
    );
    if (param === "1" || param === "true" || param === "package") {
        return true;
    }
    if (param === "0" || param === "false" || param === "legacy") {
        return false;
    }

    const stored = window.localStorage.getItem(
        PACKAGE_WORKFLOW_PANEL_STORAGE_KEY,
    );
    if (stored === "package") return true;
    if (stored === "legacy") return false;
    return envDefault;
}

function persistPackageWorkflowPanelPreference(enabled: boolean) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
        PACKAGE_WORKFLOW_PANEL_STORAGE_KEY,
        enabled ? "package" : "legacy",
    );
}

function PackageWorkflowPanelDevToggle({
    enabled,
    onChange,
}: {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}) {
    return (
        <Env isDev>
            <div className="fixed bottom-3 left-3 z-50 rounded-lg border bg-background/95 p-2 text-xs shadow-lg">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(event) => onChange(event.target.checked)}
                    />
                    <span>Package workflow panel</span>
                </label>
            </div>
        </Env>
    );
}

function getLineTitlePlaceholder(line: {
    title?: string | null;
    formSteps?: Array<{
        step?: { title?: string | null } | null;
        title?: string | null;
        value?: string | null;
        prodUid?: string | null;
    }> | null;
}) {
    const explicitTitle = String(line?.title || "").trim();
    if (explicitTitle) return explicitTitle;
    const steps = line?.formSteps || [];
    const itemTypeStep = steps.find(
        (step) =>
            String(step?.step?.title || "")
                .trim()
                .toLowerCase() === "item type",
    );
    const itemTypeLabel = String(
        itemTypeStep?.value ||
            itemTypeStep?.title ||
            itemTypeStep?.prodUid ||
            "",
    ).trim();
    return itemTypeLabel || "";
}

function lineItemPickerLabel(
    line: {
        title?: string | null;
        formSteps?: Array<{
            step?: { title?: string | null } | null;
            title?: string | null;
            value?: string | null;
            prodUid?: string | null;
        }> | null;
    },
    index: number,
) {
    const explicitTitle = String(line?.title || "").trim();
    if (explicitTitle) return explicitTitle;
    const placeholder = getLineTitlePlaceholder(line);
    return placeholder
        ? `Item ${index + 1} (${placeholder})`
        : `Item ${index + 1}`;
}

type DispatchStatus =
    | "queue"
    | "packing queue"
    | "packed"
    | "in progress"
    | "completed"
    | "cancelled";

type PackingDispatch = {
    id: number;
    status?: string | null;
    deliveryMode?: string | null;
};

const PAYMENT_METHODS = [
    "Cash",
    "Check",
    "Credit Card",
    "ACH",
    "Link",
    "Wire Transfer",
];

function normalizeDispatchStatus(status?: string | null): DispatchStatus {
    switch (status) {
        case "packing queue":
        case "packed":
        case "in progress":
        case "completed":
        case "cancelled":
            return status;
        default:
            return "queue";
    }
}

function SkeletonBlock({ className }: { className: string }) {
    return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

function SkeletonIcon() {
    return <div className="size-8 animate-pulse rounded-full bg-muted" />;
}

function WorkflowPanelSkeleton() {
    return (
        <div className="divide-y divide-border/40">
            {[0, 1, 2].map((itemIndex) => (
                <div
                    key={`workflow-skeleton-${itemIndex}`}
                    className="bg-background p-4"
                >
                    <div className="grid gap-4 md:grid-cols-12">
                        <div className="md:col-span-10">
                            <SkeletonBlock className="h-10 w-full" />
                        </div>
                        <div className="flex items-center justify-end gap-2 md:col-span-2">
                            <SkeletonBlock className="h-5 w-20" />
                            <SkeletonIcon />
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <SkeletonBlock className="h-6 w-28 rounded-full" />
                        <SkeletonBlock className="h-6 w-36 rounded-full" />
                        <SkeletonBlock className="h-6 w-24 rounded-full" />
                    </div>
                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                            <SkeletonBlock className="size-12" />
                            <div className="min-w-0 flex-1 space-y-2">
                                <SkeletonBlock className="h-4 w-56 max-w-full" />
                                <SkeletonBlock className="h-3 w-28" />
                            </div>
                            <div className="flex gap-1">
                                <SkeletonIcon />
                                <SkeletonIcon />
                                <SkeletonIcon />
                            </div>
                        </div>
                        <div className="grid gap-3 p-4 sm:grid-cols-3">
                            <SkeletonBlock className="h-16 w-full" />
                            <SkeletonBlock className="h-16 w-full" />
                            <SkeletonBlock className="h-16 w-full" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function NewSalesFormSkeleton() {
    return (
        <div className="fixed bottom-0 left-0 right-0 top-[var(--header-height)] overflow-hidden bg-background md:left-[84px]">
            <div className="relative flex h-full min-h-0 overflow-hidden border border-slate-200/80 bg-background shadow-sm">
                <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <div className="shrink-0 border-b bg-card px-4 py-3 sm:px-5">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="space-y-2">
                                <SkeletonBlock className="h-5 w-44" />
                                <SkeletonBlock className="h-3 w-64 max-w-[70vw]" />
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <SkeletonBlock className="hidden h-8 w-28 rounded-full sm:block" />
                                <SkeletonIcon />
                                <SkeletonIcon />
                                <SkeletonIcon />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden pb-28 lg:pb-20">
                        <div className="mx-auto flex w-full max-w-6xl flex-col">
                            <WorkflowPanelSkeleton />
                        </div>
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-1 z-20 hidden justify-center px-2 pb-[env(safe-area-inset-bottom)] lg:flex">
                        <div className="pointer-events-auto flex w-fit max-w-[calc(100%-1rem)] items-center gap-1 rounded-full border border-slate-200 bg-card/95 p-1 shadow-lg backdrop-blur">
                            <SkeletonIcon />
                            <SkeletonIcon />
                            <SkeletonIcon />
                            <SkeletonIcon />
                        </div>
                    </div>
                </main>
                <aside className="hidden w-80 shrink-0 border-l bg-card/80 p-4 xl:block">
                    <div className="space-y-4">
                        <SkeletonBlock className="h-5 w-32" />
                        <SkeletonBlock className="h-24 w-full" />
                        <SkeletonBlock className="h-24 w-full" />
                        <div className="space-y-2 pt-2">
                            <SkeletonBlock className="h-4 w-full" />
                            <SkeletonBlock className="h-4 w-4/5" />
                            <SkeletonBlock className="h-10 w-full" />
                        </div>
                    </div>
                </aside>
                <div className="absolute inset-x-0 bottom-0 z-20 border-t bg-card p-3 shadow-[0_-4px_18px_rgba(0,0,0,0.08)] lg:hidden">
                    <div className="mx-auto flex w-full max-w-lg items-center gap-3">
                        <div className="flex-1 space-y-2">
                            <SkeletonBlock className="h-3 w-24" />
                            <SkeletonBlock className="h-6 w-32" />
                        </div>
                        <SkeletonBlock className="h-11 w-24" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function NewSalesForm(props: Props) {
    const router = useRouter();
    const salesPrint = useSalesPrintController();
    const salesPreview = useSalesPreview();
    const overviewQuery = useSalesOverviewQuery();
    const salesQueryClient = useSalesQueryClient();
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const auth = useAuth();
    const [draftParams, setDraftParams] = useCreateFormQueryParams();
    const [paymentReviewOpen, setPaymentReviewOpen] = useState(false);
    const [paymentReviewSeen, setPaymentReviewSeen] = useState(false);
    const [manualSaveLock, setManualSaveLock] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const { inventoryConfiguratorDialog, openSalesInventoryConfigurator } =
        useSalesInventoryConfiguratorPrompt();
    const [usePackageWorkflowPanel, setUsePackageWorkflowPanelState] = useState(
        resolveInitialPackageWorkflowPanelEnabled,
    );
    const setUsePackageWorkflowPanel = useCallback((enabled: boolean) => {
        setUsePackageWorkflowPanelState(enabled);
        persistPackageWorkflowPanelPreference(enabled);
    }, []);
    const record = useNewSalesFormStore((s) => s.record);
    const dirty = useNewSalesFormStore((s) => s.dirty);
    const saveStatus = useNewSalesFormStore((s) => s.saveStatus);
    const lastSavedAt = useNewSalesFormStore((s) => s.lastSavedAt);
    const lastSaveError = useNewSalesFormStore((s) => s.lastSaveError);
    const hydrate = useNewSalesFormStore((s) => s.hydrate);
    const restoreLocalDraft = useNewSalesFormStore((s) => s.restoreLocalDraft);
    const addLineItem = useNewSalesFormStore((s) => s.addLineItem);
    const markSaving = useNewSalesFormStore((s) => s.markSaving);
    const markSaved = useNewSalesFormStore((s) => s.markSaved);
    const markError = useNewSalesFormStore((s) => s.markError);
    const markStale = useNewSalesFormStore((s) => s.markStale);
    const patchRecord = useNewSalesFormStore((s) => s.patchRecord);
    const editor = useNewSalesFormStore((s) => s.editor);
    const setEditor = useNewSalesFormStore((s) => s.setEditor);
    const setMeta = useNewSalesFormStore((s) => s.setMeta);
    const [recoverySnapshot, setRecoverySnapshot] =
        useState<NewSalesFormRecoverySnapshot | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [bootstrapCustomerId] = useState<number | null>(() =>
        normalizeSalesFormInitialCustomerId(draftParams.selectedCustomerId),
    );
    const lastHydratedLoadKeyRef = useRef<string | null>(null);
    const leaveWarningBypassedRef = useRef(false);

    const bootstrapQuery = useNewSalesFormBootstrapQuery(
        {
            type: props.type,
            customerId: bootstrapCustomerId,
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

    const loadData =
        props.mode === "create" ? bootstrapQuery.data : getQuery.data;
    const isLoading =
        props.mode === "create" ? bootstrapQuery.isPending : getQuery.isPending;
    const loadError =
        props.mode === "create" ? bootstrapQuery.error : getQuery.error;
    const customerSelectionRequired =
        props.mode === "create" && !!record && !record.form.customerId;
    const isSaved = Boolean(record?.salesId && record?.orderId);
    const isOrder = props.type === "order";
    const salesFormCapabilities = useSalesFormCapabilities(props.type);
    const salesFormPermissions = useSalesFormPermissions(props.type);
    const actorId = Number(auth.id || 0) > 0 ? Number(auth.id) : 1;
    const actorName = auth.name || "System";

    const dispatchOverview = useQuery(
        trpc.dispatch.orderDispatchOverview.queryOptions(
            {
                salesId: record?.salesId || 0,
            },
            {
                enabled: isOrder && !!record?.salesId,
            },
        ),
    );
    const packingDispatches = useMemo(
        () =>
            (
                ((dispatchOverview.data?.deliveries as
                    | PackingDispatch[]
                    | undefined) || []) as PackingDispatch[]
            )
                .filter(
                    (dispatch) =>
                        !dispatch.deliveryMode ||
                        String(dispatch.deliveryMode).toLowerCase() ===
                            "pickup",
                )
                .sort((left, right) => right.id - left.id),
        [dispatchOverview.data?.deliveries],
    );
    const activePackingDispatch = useMemo(
        () =>
            packingDispatches.find(
                (dispatch) =>
                    dispatch.status !== "completed" &&
                    dispatch.status !== "cancelled",
            ) || null,
        [packingDispatches],
    );
    const currentPackingDispatch =
        activePackingDispatch || packingDispatches[0] || null;
    const packingIsCompleted = currentPackingDispatch?.status === "completed";

    const buildEditHref = useCallback(
        (next: { slug?: string | null; orderId?: string | null }) => {
            const slug = next.slug || record?.slug;
            const orderId = next.orderId || record?.orderId;
            if (!slug || !orderId) return null;
            const path =
                props.type === "order"
                    ? `/sales-form/edit-order/${slug}`
                    : `/sales-form/edit-quote/${slug}`;
            const search = new URLSearchParams({
                "sales-overview-id": orderId,
                "sales-type": props.type,
                mode: props.type === "order" ? "sales" : "quote",
                salesTab: "general",
            });
            return `${path}?${search.toString()}`;
        },
        [props.type, record?.orderId, record?.slug],
    );

    const clearSelectedCustomerQuery = useCallback(async () => {
        if (draftParams.selectedCustomerId == null) return;
        await setDraftParams({
            selectedCustomerId: null,
        });
    }, [draftParams.selectedCustomerId, setDraftParams]);

    const invalidatePackingQueries = useCallback(
        async (salesId?: number | null) => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.packingList.pathKey(),
                }),
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.packingQueue.queryKey(),
                }),
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.orderDispatchOverview.pathKey(),
                }),
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.dispatchOverview.queryKey(),
                }),
                queryClient.invalidateQueries({
                    queryKey: trpc.dispatch.dispatchOverviewV2.queryKey(),
                }),
                queryClient.invalidateQueries({
                    queryKey: trpc.sales.getSaleOverview.pathKey(),
                }),
                ...(salesId
                    ? [
                          queryClient.invalidateQueries({
                              queryKey:
                                  trpc.dispatch.orderDispatchOverview.queryKey({
                                      salesId,
                                  }),
                          }),
                      ]
                    : []),
            ]);
        },
        [queryClient, trpc],
    );
    const sendForPackingMutation = useMutation(
        trpc.dispatch.sendSaleForPickup.mutationOptions(),
    );
    const updateDispatchStatusMutation = useMutation(
        trpc.dispatch.updateDispatchStatus.mutationOptions(),
    );
    const submitDispatchMutation = useMutation(
        trpc.dispatch.submitDispatch.mutationOptions(),
    );
    const packingTaskTrigger = useTaskTrigger({
        silent: true,
        monitor: true,
        onSuccess() {
            void invalidatePackingQueries(record?.salesId);
        },
    });
    const isPackingBusy =
        sendForPackingMutation.isPending ||
        updateDispatchStatusMutation.isPending ||
        submitDispatchMutation.isPending ||
        packingTaskTrigger.isActionPending;

    useEffect(() => {
        if (!loadData) return;
        const loadKey = `${props.mode}:${props.type}:${String(loadData.salesId ?? "new")}:${String(loadData.slug ?? "draft")}:${String(loadData.version ?? "v0")}`;
        const shouldHydrate =
            !record || lastHydratedLoadKeyRef.current !== loadKey;
        if (!shouldHydrate) return;
        lastHydratedLoadKeyRef.current = loadKey;
        hydrate(loadData as NewSalesFormRecord);
    }, [loadData, hydrate, record, props.mode, props.type]);

    const payload = useMemo(() => {
        if (!record) return null;
        return toSaveDraftInput(record, true);
    }, [record]);
    const recordPaymentMeta = record as {
        paymentMethodReviewDismissed?: unknown;
        paymentTotal?: unknown;
    } | null;
    const shouldReviewPaymentMethod =
        isOrder &&
        props.mode === "edit" &&
        Boolean(record?.salesId) &&
        !paymentReviewSeen &&
        !recordPaymentMeta?.paymentMethodReviewDismissed &&
        Number(recordPaymentMeta?.paymentTotal || 0) <= 0 &&
        (!record?.form?.paymentMethod ||
            record.form.paymentMethod !== "Credit Card");
    const itemOptions = useMemo(
        () =>
            (record?.lineItems || []).map((line, index) => ({
                uid: line.uid,
                label: lineItemPickerLabel(line, index),
            })),
        [record?.lineItems],
    );

    useEffect(() => {
        if (shouldReviewPaymentMethod) setPaymentReviewOpen(true);
    }, [shouldReviewPaymentMethod]);

    async function dismissPaymentMethodReview(checked: boolean) {
        if (!checked || !record?.salesId) return;
        await updateSalesMetaAction(record.salesId, {
            paymentMethodReviewDismissed: true,
        });
        setPaymentReviewSeen(true);
        setPaymentReviewOpen(false);
    }
    const recoveryKey = useMemo(
        () =>
            getRecoveryStorageKey({
                type: props.type,
                slug: props.slug || record?.slug || null,
                salesId: record?.salesId || null,
            }),
        [props.type, props.slug, record?.salesId, record?.slug],
    );
    const draftRecoveryKey = useMemo(
        () =>
            getRecoveryStorageKey({
                type: props.type,
            }),
        [props.type],
    );

    const clearRecoveryKeys = useCallback(
        (next?: { slug?: string | null; salesId?: string | number | null }) => {
            const keys = new Set<string>([recoveryKey, draftRecoveryKey]);
            if (next?.slug || next?.salesId) {
                keys.add(
                    getRecoveryStorageKey({
                        type: props.type,
                        slug: next.slug || null,
                        salesId: next.salesId || null,
                    }),
                );
            }
            for (const key of keys) {
                clearRecoverySnapshot(key);
            }
            setRecoverySnapshot(null);
        },
        [draftRecoveryKey, props.type, recoveryKey],
    );

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
            clearRecoveryKeys({
                slug: resp?.slug,
                salesId: resp?.salesId,
            });
        },
        onStale: (error) => {
            markStale(getErrorMessage(error, "Version conflict detected."));
            toast({
                title: "This form is out of date",
                description: "Reload latest data before continuing.",
                variant: "destructive",
            });
        },
        onError: (error) => {
            markError(getErrorMessage(error, "Autosave failed."));
        },
    });

    const finalSave = useSaveFinalNewSalesFormMutation();
    const taskTrigger = useTaskTrigger({
        silent: true,
    });
    const isSaveBusy =
        manualSaveLock || autosave.isSaving || finalSave.isPending;
    const ensurePackingDispatch = useCallback(async () => {
        if (activePackingDispatch?.id) {
            return {
                id: activePackingDispatch.id,
                status: normalizeDispatchStatus(activePackingDispatch.status),
            };
        }
        if (!record?.salesId) {
            throw new Error("Save the order before sending it for packing.");
        }
        const result = await sendForPackingMutation.mutateAsync({
            salesId: record.salesId,
        });
        await invalidatePackingQueries(record.salesId);
        return {
            id: result.dispatchId,
            status: normalizeDispatchStatus(result.status),
        };
    }, [
        activePackingDispatch,
        invalidatePackingQueries,
        record?.salesId,
        sendForPackingMutation,
    ]);
    const handleSendForPacking = useCallback(async () => {
        if (!record?.salesId || !record?.orderId) return;
        try {
            const result = await sendForPackingMutation.mutateAsync({
                salesId: record.salesId,
            });
            await invalidatePackingQueries(record.salesId);
            if (!result.hasRemainingItems) {
                toast({
                    title: "Nothing left to send",
                    description: `No remaining items are available for ${record.orderId}.`,
                });
                return;
            }
            toast({
                title: result.created ? "Packing created" : "Sent for packing",
                description: `${result.orderNo || record.orderId} is ready in the packing queue.`,
                variant: "success",
            });
        } catch (error) {
            toast({
                title: "Unable to send for packing",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive",
            });
        }
    }, [
        invalidatePackingQueries,
        record?.orderId,
        record?.salesId,
        sendForPackingMutation,
    ]);
    const handleCancelPacking = useCallback(async () => {
        if (!currentPackingDispatch?.id) return;
        try {
            await updateDispatchStatusMutation.mutateAsync({
                dispatchId: currentPackingDispatch.id,
                oldStatus: normalizeDispatchStatus(
                    currentPackingDispatch.status,
                ),
                newStatus: "cancelled",
            });
            await invalidatePackingQueries(record?.salesId);
            toast({
                title: "Packing cancelled",
                description: `${record?.orderId || "Order"} was removed from packing.`,
                variant: "success",
            });
        } catch (error) {
            toast({
                title: "Unable to cancel packing",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive",
            });
        }
    }, [
        currentPackingDispatch,
        invalidatePackingQueries,
        record?.orderId,
        record?.salesId,
        updateDispatchStatusMutation,
    ]);
    const handleCompletePacking = useCallback(async () => {
        if (!record?.salesId) return;
        try {
            const dispatch = await ensurePackingDispatch();
            packingTaskTrigger.trigger({
                taskName: "update-sales-control",
                payload: {
                    meta: {
                        authorId: actorId,
                        salesId: record.salesId,
                        authorName: actorName,
                    },
                    packItems: {
                        dispatchId: dispatch.id,
                        dispatchStatus: "completed",
                        packMode: "all",
                        replaceExisting: true,
                    },
                },
            });
            await submitDispatchMutation.mutateAsync({
                meta: {
                    salesId: record.salesId,
                    authorId: actorId,
                    authorName: actorName,
                },
                submitDispatch: {
                    dispatchId: dispatch.id,
                    receivedBy: actorName,
                    receivedDate: new Date(),
                },
            });
            await invalidatePackingQueries(record.salesId);
            toast({
                title: "Packing completed",
                description: `${record.orderId || "Order"} was auto-packed and completed.`,
                variant: "success",
            });
        } catch (error) {
            toast({
                title: "Unable to complete packing",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive",
            });
        }
    }, [
        actorId,
        actorName,
        ensurePackingDispatch,
        invalidatePackingQueries,
        packingTaskTrigger,
        record?.orderId,
        record?.salesId,
        submitDispatchMutation,
    ]);
    const handleOpenPacking = useCallback(() => {
        if (!record?.orderId) return;
        const href = `/sales/packing-list?q=${encodeURIComponent(record.orderId)}`;
        window.open(href, "_blank", "noopener,noreferrer");
    }, [record?.orderId]);

    const handlePostSaveSuccess = useCallback(
        async (resp: {
            salesId?: number | null;
            slug?: string | null;
            orderId?: string | null;
            inventoryStatus?: string | null;
            status?: string | null;
            version?: string | null;
            updatedAt?: string | null;
            type?: "order" | "quote" | null;
            isNew?: boolean | null;
        }) => {
            patchRecord({
                salesId: resp?.salesId,
                slug: resp?.slug,
                orderId: resp?.orderId,
                inventoryStatus: resp?.inventoryStatus,
                status: resp?.status,
            });
            markSaved({
                version: resp?.version,
                updatedAt: resp?.updatedAt || new Date().toISOString(),
            });
            clearRecoveryKeys({
                slug: resp?.slug,
                salesId: resp?.salesId,
            });

            if (resp?.orderId && resp?.type) {
                taskTrigger.triggerWithAuth("create-sales-history", {
                    salesNo: resp.orderId,
                    salesType: resp.type,
                } as CreateSalesHistorySchemaTask);
            }
            if (resp?.type === "order" && resp?.salesId && resp?.orderId) {
                await resetSalesStatAction(resp.salesId, resp.orderId);
            }
            await salesQueryClient.invalidate.salesDocumentChanged(resp?.type);
            if (resp?.salesId) {
                await triggerEvent(
                    resp?.isNew ? "salesCreated" : "salesUpdated",
                    resp.salesId,
                );
            }
        },
        [clearRecoveryKeys, markSaved, patchRecord, salesQueryClient, taskTrigger],
    );

    const configureInventoryAfterSave = useCallback(
        async (resp: { salesId?: number | null }) => {
            if (!isOrder) return;
            await openSalesInventoryConfigurator(resp.salesId);
        },
        [isOrder, openSalesInventoryConfigurator],
    );

    useEffect(() => {
        if (!loadData) return;
        const serverPayload = toSaveDraftInput(loadData, true);
        const serverFingerprint = createPayloadFingerprint(serverPayload);
        const snapshot =
            readRecoverySnapshot(recoveryKey) ||
            (recoveryKey !== draftRecoveryKey
                ? readRecoverySnapshot(draftRecoveryKey)
                : null);
        if (!snapshot) {
            setRecoverySnapshot(null);
            return;
        }
        if (createPayloadFingerprint(snapshot.payload) === serverFingerprint) {
            setRecoverySnapshot(null);
            return;
        }
        setRecoverySnapshot(snapshot);
    }, [draftRecoveryKey, loadData, recoveryKey]);

    useEffect(() => {
        if (!dirty || !payload) return;
        const timer = setTimeout(() => {
            writeRecoverySnapshot(recoveryKey, payload);
        }, 750);
        return () => clearTimeout(timer);
    }, [dirty, payload, recoveryKey]);

    useEffect(() => {
        if (!dirty || !payload) return;

        const persistSnapshot = () => {
            writeRecoverySnapshot(recoveryKey, payload);
        };

        window.addEventListener("pagehide", persistSnapshot);
        window.addEventListener("beforeunload", persistSnapshot);
        return () => {
            window.removeEventListener("pagehide", persistSnapshot);
            window.removeEventListener("beforeunload", persistSnapshot);
        };
    }, [dirty, payload, recoveryKey]);

    useEffect(() => {
        if (!dirty || !payload) return;
        const shouldPromptOnLeave =
            dirty &&
            (!editor.autosaveEnabled ||
                saveStatus === "error" ||
                saveStatus === "stale");
        if (!shouldPromptOnLeave) return;

        const handleDocumentClick = (event: MouseEvent) => {
            if (leaveWarningBypassedRef.current) return;
            if (event.defaultPrevented) return;
            if (event.button !== 0) return;
            if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) return;

            const anchor = target.closest(
                "a[href]",
            ) as HTMLAnchorElement | null;
            if (!anchor) return;
            if (anchor.target && anchor.target !== "_self") return;
            if (anchor.hasAttribute("download")) return;

            const href = anchor.href;
            if (!href) return;

            const nextUrl = new URL(href, window.location.href);
            const currentUrl = new URL(window.location.href);
            const isSameDocumentNavigation =
                nextUrl.pathname === currentUrl.pathname &&
                nextUrl.search === currentUrl.search &&
                nextUrl.hash === currentUrl.hash;
            if (isSameDocumentNavigation) return;

            event.preventDefault();
            writeRecoverySnapshot(recoveryKey, payload);

            const confirmed = window.confirm(
                "You have unsaved changes that may not be safely persisted yet. Leave this page?",
            );
            if (!confirmed) return;

            leaveWarningBypassedRef.current = true;
            window.location.assign(nextUrl.toString());
        };

        document.addEventListener("click", handleDocumentClick, true);
        return () => {
            document.removeEventListener("click", handleDocumentClick, true);
        };
    }, [dirty, editor.autosaveEnabled, payload, recoveryKey, saveStatus]);

    const applyRecoverySnapshot = useCallback(() => {
        if (!loadData || !recoverySnapshot) return;
        restoreLocalDraft({
            ...loadData,
            salesId: recoverySnapshot.payload.salesId ?? loadData.salesId,
            slug: recoverySnapshot.payload.slug ?? loadData.slug,
            version: loadData.version,
            form: recoverySnapshot.payload.meta,
            lineItems: recoverySnapshot.payload.lineItems,
            extraCosts: recoverySnapshot.payload.extraCosts,
            summary: recoverySnapshot.payload.summary,
        } as NewSalesFormRecord);
        setRecoverySnapshot(null);
        toast({
            title: "Local recovery restored",
            description: "Recovered unsaved edits from this device.",
            variant: "success",
        });
    }, [loadData, recoverySnapshot, restoreLocalDraft]);

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

    async function runWithManualSaveLock(action: () => Promise<void>) {
        if (isSaveBusy) return;
        setManualSaveLock(true);
        try {
            await action();
        } finally {
            setManualSaveLock(false);
        }
    }

    async function saveDraftNow() {
        await runWithManualSaveLock(async () => {
            if (!record) return;
            if (!validateBeforeSave()) return;
            markSaving();
            const resp = await autosave.flush("manual-flush", {
                force: true,
            });
            if (!resp) {
                markError("Unable to save draft.");
                return;
            }
            await handlePostSaveSuccess(resp);
            await configureInventoryAfterSave(resp);
            await clearSelectedCustomerQuery();
            if (props.mode === "create") {
                const editHref = buildEditHref(resp);
                if (editHref) {
                    router.push(editHref);
                    return;
                }
            }
            toast({
                title: "Draft saved",
                variant: "success",
            });
        });
    }

    async function saveFinal() {
        await runWithManualSaveLock(async () => {
            if (!record) return;
            if (!validateBeforeSave()) return;
            markSaving();
            const payload = {
                ...toSaveDraftInput(record, false),
            };
            try {
                const resp = await finalSave.mutateAsync({
                    ...payload,
                    autosave: false,
                });
                await handlePostSaveSuccess(resp);
                await configureInventoryAfterSave(resp);
                toast({
                    title: "Saved",
                    description: `${props.type} ${resp?.orderId} has been finalized.`,
                    variant: "success",
                });
                await clearSelectedCustomerQuery();
                if (props.mode === "create") {
                    const editHref = buildEditHref(resp);
                    if (editHref) {
                        router.push(editHref);
                        return;
                    }
                }
            } catch (error) {
                const message = getErrorMessage(error, "Unable to save.");
                if (
                    String(message || "")
                        .toLowerCase()
                        .includes("out of date")
                ) {
                    markStale(message);
                } else markError(message);
                toast({
                    title: "Save failed",
                    description: message || "Unable to save final form.",
                    variant: "destructive",
                });
            }
        });
    }

    async function saveClose() {
        await runWithManualSaveLock(async () => {
            if (!record) return;
            if (!validateBeforeSave()) return;
            if (dirty) {
                const resp = await autosave.flush("manual-flush");
                if (!resp) return;
                await handlePostSaveSuccess(resp);
                await configureInventoryAfterSave(resp);
                await clearSelectedCustomerQuery();
            } else {
                await configureInventoryAfterSave(record);
            }
            router.push(
                `/sales-book/${props.type === "order" ? "orders" : "quotes"}`,
            );
        });
    }

    async function saveNew() {
        await runWithManualSaveLock(async () => {
            if (!record) return;
            if (!validateBeforeSave()) return;
            if (dirty) {
                const resp = await autosave.flush("manual-flush");
                if (!resp) return;
                await handlePostSaveSuccess(resp);
                await configureInventoryAfterSave(resp);
                await clearSelectedCustomerQuery();
            } else {
                await configureInventoryAfterSave(record);
            }
            router.push(
                `/sales-form/${props.type === "order" ? "create-order" : "create-quote"}`,
            );
        });
    }

    async function handlePrint(event?: ReactMouseEvent<HTMLButtonElement>) {
        const openInNewTab = event?.shiftKey ?? false;
        await runWithManualSaveLock(async () => {
            if (!record) return;
            if (!validateBeforeSave()) return;
            if (saveStatus === "stale") {
                toast({
                    title: "Print unavailable",
                    description:
                        "Reload latest data before printing this form.",
                    variant: "destructive",
                });
                return;
            }

            let salesId = record.salesId;
            let shouldRegeneratePrint = false;

            if (dirty) {
                const resp = await autosave.flush("manual-flush");
                if (!resp?.salesId) {
                    toast({
                        title: "Unable to prepare print",
                        description: "Save the latest changes before printing.",
                        variant: "destructive",
                    });
                    return;
                }
                await handlePostSaveSuccess(resp);
                salesId = resp.salesId;
                shouldRegeneratePrint = true;
            }

            if (!salesId) {
                toast({
                    title: "Unable to prepare print",
                    description: "Save this form before printing.",
                    variant: "destructive",
                });
                return;
            }

            await salesPrint.print({
                salesIds: [salesId],
                mode: props.type === "order" ? "invoice" : "quote",
                forceRegenerate: shouldRegeneratePrint,
                openInNewTab,
                salesType: props.type,
            });
        });
    }

    async function handleDownloadPdf() {
        await runWithManualSaveLock(async () => {
            if (!record) return;
            if (!validateBeforeSave()) return;
            if (saveStatus === "stale") {
                toast({
                    title: "PDF unavailable",
                    description:
                        "Reload latest data before downloading this form.",
                    variant: "destructive",
                });
                return;
            }

            let salesId = record.salesId;
            let shouldRegeneratePdf = false;

            if (dirty) {
                const resp = await autosave.flush("manual-flush");
                if (!resp?.salesId) {
                    toast({
                        title: "Unable to prepare PDF",
                        description: "Save the latest changes before downloading.",
                        variant: "destructive",
                    });
                    return;
                }
                await handlePostSaveSuccess(resp);
                salesId = resp.salesId;
                shouldRegeneratePdf = true;
            }

            if (!salesId) {
                toast({
                    title: "Unable to prepare PDF",
                    description: "Save this form before downloading.",
                    variant: "destructive",
                });
                return;
            }

            await salesPrint.downloadPdf({
                salesIds: [salesId],
                mode: props.type === "order" ? "invoice" : "quote",
                forceRegenerate: shouldRegeneratePdf,
                salesType: props.type,
            });
        });
    }

    async function handlePreview() {
        if (isPreviewing) return;
        await runWithManualSaveLock(async () => {
            if (!record) return;
            if (!validateBeforeSave()) return;
            if (saveStatus === "stale") {
                toast({
                    title: "Preview unavailable",
                    description:
                        "Reload latest data before previewing this form.",
                    variant: "destructive",
                });
                return;
            }

            setIsPreviewing(true);
            try {
                let salesId = record.salesId;

                if (dirty || !salesId) {
                    const resp = await autosave.flush("manual-flush", {
                        force: !salesId,
                    });
                    if (!resp?.salesId) {
                        toast({
                            title: "Unable to prepare preview",
                            description:
                                "Save the latest changes before previewing.",
                            variant: "destructive",
                        });
                        return;
                    }
                    await handlePostSaveSuccess(resp);
                    salesId = resp.salesId;
                }

                if (!salesId) {
                    toast({
                        title: "Unable to prepare preview",
                        description: "Save this form before previewing.",
                        variant: "destructive",
                    });
                    return;
                }

                await salesPreview.preview(salesId, props.type, {
                    customerEmail: record.customer?.email ?? null,
                    customerName:
                        record.customer?.businessName ||
                        record.customer?.name ||
                        null,
                });
            } finally {
                setIsPreviewing(false);
            }
        });
    }

    function handleOpenOverview() {
        if (!record?.orderId) return;
        overviewQuery.open2(
            record.orderId,
            props.type === "order" ? "sales" : "quote",
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

    if (isLoading || !record) {
        return <NewSalesFormSkeleton />;
    }

    const salesId = Number(record.salesId || 0);
    const customer = record.customer;
    const customerId = Number(customer?.id || record.form.customerId || 0);
    const amountDue = Math.max(
        0,
        Number(record.summary.grandTotal || 0) -
            Number(record.paymentTotal || 0),
    );
    const canPay = isOrder && isSaved && amountDue > 0 && customerId > 0;
    const salesIds = salesId ? [salesId] : [];
    const customerName = customer?.businessName || customer?.name || undefined;
    const paymentAction =
        isOrder && salesId ? (
            <SalesPaymentProcessor
                phoneNo={customer?.phoneNo}
                selectedIds={salesIds}
                customerId={customerId}
                disabled={!canPay}
            >
                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled={!canPay}
                    className="size-8 rounded-full"
                    aria-label="Pay"
                    title="Pay"
                >
                    <Icons.payment className="size-3.5" />
                </Button>
            </SalesPaymentProcessor>
        ) : null;
    const paymentMenuAction =
        isOrder && salesId ? (
            <SalesPaymentProcessor
                phoneNo={customer?.phoneNo}
                selectedIds={salesIds}
                customerId={customerId}
                disabled={!canPay}
            >
                <DropdownMenuItem
                    disabled={!canPay}
                    onSelect={(event) => event.preventDefault()}
                >
                    <Icons.payment className="mr-2 size-4" />
                    Pay
                </DropdownMenuItem>
            </SalesPaymentProcessor>
        ) : null;
    const emailAction = salesId ? (
        <SalesMenu
            id={salesId}
            salesIds={salesIds}
            type={props.type}
            orderNo={record.orderId}
            customerEmail={customer?.email ?? null}
            customerName={customerName}
            trigger={
                <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8 rounded-full"
                    aria-label="Email"
                    title="Email"
                >
                    <Icons.Mail className="size-3.5" />
                </Button>
            }
        >
            {isOrder ? (
                <SalesMenu.SalesEmailMenuItems />
            ) : (
                <SalesMenu.QuoteEmailMenuItems />
            )}
        </SalesMenu>
    ) : null;
    const emailMenuAction = salesId ? (
        <SalesMenu
            id={salesId}
            salesIds={salesIds}
            type={props.type}
            orderNo={record.orderId}
            customerEmail={customer?.email ?? null}
            customerName={customerName}
            trigger={
                <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                    <Icons.Mail className="mr-2 size-4" />
                    Email
                </DropdownMenuItem>
            }
        >
            {isOrder ? (
                <SalesMenu.SalesEmailMenuItems />
            ) : (
                <SalesMenu.QuoteEmailMenuItems />
            )}
        </SalesMenu>
    ) : null;

    return (
        <>
            <SalesFormDevSwitcher
                currentForm="new"
                type={props.type}
                slug={record.slug || props.slug}
                orderId={record.orderId}
            />
            <PackageWorkflowPanelDevToggle
                enabled={usePackageWorkflowPanel}
                onChange={setUsePackageWorkflowPanel}
            />
            {inventoryConfiguratorDialog}
            {settingsOpen ? (
                <NewSalesFormSettingsModal
                    open={settingsOpen}
                    onOpenChange={setSettingsOpen}
                />
            ) : null}
            <SalesFormShell
                mode={props.mode}
                type={props.type}
                record={record}
                state={{
                    dirty,
                    editor,
                    lastSavedAt,
                    lastSaveError,
                    saveStatus,
                }}
                actions={{
                    addLineItem,
                    saveDraftNow,
                    saveClose,
                    saveNew,
                    saveFinal,
                    setEditor,
                }}
                orderId={record.orderId}
                grandTotal={record.summary.grandTotal}
                isSaved={isSaved}
                isSaving={isSaveBusy}
                mobileSummaryOpen={editor.showMobileSummary}
                capabilities={salesFormCapabilities}
                permissions={salesFormPermissions}
                onSaveDraft={saveDraftNow}
                onSaveClose={saveClose}
                onSaveNew={saveNew}
                onSaveFinal={saveFinal}
                onOpenSummary={() =>
                    customerSelectionRequired
                        ? undefined
                        : setEditor({
                              showMobileSummary: true,
                          })
                }
                onCloseSummary={() =>
                    setEditor({
                        showMobileSummary: false,
                    })
                }
                slots={{
                    CustomerSelectorDialog: (
                        <CustomerSelectorDialog
                            mode={props.mode}
                            open={customerSelectionRequired}
                            required
                            type={props.type}
                        />
                    ),
                    PaymentMethodReviewDialog: (
                        <PaymentMethodReviewDialog
                            open={isOrder && paymentReviewOpen}
                            paymentMethod={record.form.paymentMethod}
                            paymentMethods={PAYMENT_METHODS}
                            onOpenChange={(open) => {
                                setPaymentReviewOpen(open);
                                if (!open) setPaymentReviewSeen(true);
                            }}
                            onSelectPaymentMethod={(method) => {
                                setMeta({ paymentMethod: method });
                                setPaymentReviewSeen(true);
                                setPaymentReviewOpen(false);
                            }}
                            onDontAskAgainChange={dismissPaymentMethodReview}
                        />
                    ),
                    RecoveryBanner: recoverySnapshot ? (
                        <div className="m-4 flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 md:flex-row md:items-center md:justify-between sm:m-6 lg:m-8">
                            <p>
                                Unsaved local edits were found from{" "}
                                {new Date(
                                    recoverySnapshot.savedAt,
                                ).toLocaleString()}
                                .
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        clearRecoveryKeys();
                                        toast({
                                            title: "Using latest saved version",
                                            description:
                                                "Local recovery was dismissed for this draft.",
                                            variant: "success",
                                        });
                                    }}
                                >
                                    Dismiss
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={applyRecoverySnapshot}
                                >
                                    Restore
                                </Button>
                            </div>
                        </div>
                    ) : null,
                    MainPanel: usePackageWorkflowPanel ? (
                        <WwwSalesFormWorkflowPanel />
                    ) : (
                        <ItemWorkflowPanel />
                    ),
                    FloatingActions: (
                        <SalesFormFloatingActions
                            isSaved={isSaved}
                            isSaving={isSaveBusy}
                            capabilities={salesFormCapabilities}
                            permissions={salesFormPermissions}
                            isPrinting={salesPrint.isPrinting}
                            isDownloading={salesPrint.isDownloading}
                            isPreviewing={isPreviewing}
                            onAddItem={() => addLineItem()}
                            onSaveDraft={saveDraftNow}
                            onSaveClose={saveClose}
                            onSaveNew={saveNew}
                            onOpenOverview={handleOpenOverview}
                            onPreview={() => void handlePreview()}
                            onPrint={(event) => void handlePrint(event)}
                            onDownloadPdf={() => void handleDownloadPdf()}
                            paymentAction={paymentAction}
                            paymentMenuAction={paymentMenuAction}
                            enableSavedRecordActions
                            savedRecordAction={emailAction}
                            savedRecordMenuAction={emailMenuAction}
                        />
                    ),
                    SummaryPanel: (
                        <InvoiceOverviewPanel
                            mode={props.mode}
                            type={props.type}
                        />
                    ),
                    SalesHistoryPanel: salesFormCapabilities.salesHistory ? (
                        <SalesHistory salesId={record.salesId} />
                    ) : undefined,
                }}
            >
                <SalesFormHeaderActions
                    type={props.type}
                    orderId={record.orderId}
                    saveStatus={saveStatus}
                    dirty={dirty}
                    lastSavedAt={lastSavedAt}
                    statusMessage={lastSaveError}
                    isSaving={isSaveBusy}
                    autosaveEnabled={editor.autosaveEnabled}
                    stepDisplayMode={editor.stepDisplayMode}
                    onAddItem={() => addLineItem()}
                    onToggleStepDisplay={() =>
                        setEditor({
                            stepDisplayMode:
                                editor.stepDisplayMode === "extended"
                                    ? "compact"
                                    : "extended",
                        })
                    }
                    onOpenMobileSummary={() =>
                        customerSelectionRequired
                            ? undefined
                            : setEditor({
                                  showMobileSummary: !editor.showMobileSummary,
                              })
                    }
                    onToggleAutosave={() =>
                        setEditor({
                            autosaveEnabled: !editor.autosaveEnabled,
                        })
                    }
                    onSaveDraft={saveDraftNow}
                    onSaveClose={saveClose}
                    onSaveNew={saveNew}
                    onSaveFinal={saveFinal}
                    onOpenOverview={handleOpenOverview}
                    onPreview={handlePreview}
                    onPrint={handlePrint}
                    isPreviewing={isPreviewing}
                    isPrinting={salesPrint.isPrinting}
                    isSaved={isSaved}
                    showPackingControls={isOrder}
                    capabilities={salesFormCapabilities}
                    permissions={salesFormPermissions}
                    packingButtonLabel={
                        activePackingDispatch
                            ? "Packing sent"
                            : "Packing"
                    }
                    packingBusy={isPackingBusy}
                    onSendForPacking={handleSendForPacking}
                    onCancelPacking={handleCancelPacking}
                    cancelPackingDisabled={
                        !currentPackingDispatch ||
                        packingIsCompleted ||
                        currentPackingDispatch.status === "cancelled" ||
                        isPackingBusy
                    }
                    onCompletePacking={handleCompletePacking}
                    completePackingDisabled={
                        !record.salesId || packingIsCompleted || isPackingBusy
                    }
                    onOpenPacking={handleOpenPacking}
                    openPackingDisabled={!record.orderId}
                    onOpenSettings={() => setSettingsOpen(true)}
                    activeItem={
                        editor.activeItem || record.lineItems[0]?.uid || null
                    }
                    itemOptions={itemOptions}
                    onActiveItemChange={(value) =>
                        setEditor({
                            activeItem: value,
                        })
                    }
                />
            </SalesFormShell>
        </>
    );
}
