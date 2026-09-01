"use client";

import { triggerEvent } from "@/actions/events";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { updateSalesMetaAction } from "@/actions/update-sales-meta-action";
import type { SalesHistoryEntry } from "@/components/sales-hx";
import { SalesMenu } from "@/components/sales-menu";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { env } from "@/env.mjs";
import { useAuth } from "@/hooks/use-auth";
import { useLegacyInventoryAdaptationTask } from "@/hooks/use-legacy-inventory-adaptation-task";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { buildSalesOverviewUrl } from "@/hooks/sales-overview-open-params";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useSalesPrintController } from "@/modules/sales-print/application/use-sales-print-controller";
import { useTRPC } from "@/trpc/client";
import { analyzeSalesFormChange } from "@gnd/sales/adjustment-system";
import {
    SalesFormFloatingActions,
    SalesFormHeaderActions,
    SalesFormShell,
    normalizeSalesFormInitialCustomerId,
    salesFormPaymentMethods,
} from "@gnd/sales/sales-form";
import { Badge } from "@gnd/ui/badge";
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
import { resolveLegacyInventoryPostSaveAction } from "../legacy-inventory-post-save";
import { SalesFormAdoptionTracker } from "../sales-form-adoption-tracker";
import { SalesFormVersionSwitcher } from "../sales-form-version-switcher";
import { PaymentMethodReviewDialog } from "../sales-form/payment-method-review-dialog";
import { useSalesFormCapabilities } from "./adapters/use-sales-form-capabilities";
import { useSalesFormPermissions } from "./adapters/use-sales-form-permissions";
import {
    useNewSalesFormBootstrapQuery,
    useNewSalesFormGetQuery,
    useSaveFinalNewSalesFormMutation,
} from "./api";
import { createSalesHistoryRestoreRecord } from "./history-restore";
import {
    type NewSalesFormRecoverySnapshot,
    clearRecoverySnapshot,
    createPayloadFingerprint,
    getRecoveryStorageKey,
    readRecoverySnapshot,
    writeRecoverySnapshot,
} from "./local-recovery";
import { toSaveDraftInput } from "./mappers";
import {
	type SaveIntent,
	continueSaveAfterCommittedChangeReview,
	createSaveContinuationGuard,
	runCommittedChangeSubmission,
} from "./save-intent-continuation";
import {
	type NewSalesFormSaveScope,
	isLegacyPoOnlySaveResponse,
} from "./save-scope";
import type {
	NewSalesFormAdjustmentPreview,
	NewSalesFormRecord,
} from "./schema";
import { CustomerSelectorDialog } from "./sections/customer-selector-dialog";
import { SalesChangeReviewSheet } from "./sections/sales-change-review-sheet";
import {
	type SpecialOrderEnrollmentAccessState,
	resolveSpecialOrderSaveInterruption,
} from "./special-order-save-interruption";
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

const DashboardSalesFormWorkflowPanel = dynamic(
    () =>
        import("./sections/dashboard-sales-form-workflow-panel").then(
            (mod) => mod.DashboardSalesFormWorkflowPanel,
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

const SalesHistorySnapshotPreview = dynamic(
    () =>
        import("./sections/sales-history-snapshot-preview").then(
            (mod) => mod.SalesHistorySnapshotPreview,
        ),
    {
        loading: () => <WorkflowPanelSkeleton />,
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
const SHOW_LOCAL_RECOVERY_ALERT = false;

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
		itemTypeStep?.value || itemTypeStep?.title || itemTypeStep?.prodUid || "",
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

const PAYMENT_METHODS = salesFormPaymentMethods.filter(
    (method) => method !== "None",
);

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
	const specialOrderEnrollmentAccess = useQuery(
		trpc.specialOrder.enrollmentAccess.queryOptions(undefined, {
			enabled: props.type === "order",
			staleTime: 0,
		}),
	);
	const specialOrderEnrollmentState: SpecialOrderEnrollmentAccessState =
		specialOrderEnrollmentAccess.isError
			? { status: "error" }
			: specialOrderEnrollmentAccess.isFetching ||
				!specialOrderEnrollmentAccess.data
				? { status: "pending" }
				: {
						status: "ready",
						canEnroll: specialOrderEnrollmentAccess.data.canEnroll,
					};
	const canEnrollSpecialOrder =
		specialOrderEnrollmentState.status === "ready" &&
		specialOrderEnrollmentState.canEnroll;
	const removeSpecialOrderClassification = useMutation(
		trpc.specialOrder.remove.mutationOptions(),
	);
    const [draftParams, setDraftParams] = useCreateFormQueryParams();
    const [paymentReviewOpen, setPaymentReviewOpen] = useState(false);
    const [paymentReviewSeen, setPaymentReviewSeen] = useState(false);
	const [changeReviewOpen, setChangeReviewOpen] = useState(false);
	const [changeReview, setChangeReview] =
		useState<NewSalesFormAdjustmentPreview | null>(null);
	const [isApplyingAdjustment, setIsApplyingAdjustment] = useState(false);
    const [manualSaveLock, setManualSaveLock] = useState(false);
    const [pendingSpecialOrderCommit, setPendingSpecialOrderCommit] = useState<
        "draft" | "close" | "new" | "final" | null
    >(null);
	const [
		pendingCommittedChangeSaveIntent,
		setPendingCommittedChangeSaveIntent,
	] = useState<SaveIntent | null>(null);
	const committedChangeContinuationGuardRef = useRef(
		createSaveContinuationGuard(),
	);
	const committedChangeSubmissionRef = useRef(false);
	const committedChangeCreatedRef = useRef(false);
	const [
		isAwaitingCommittedChangeApplication,
		setIsAwaitingCommittedChangeApplication,
	] = useState(false);
	const manualSaveLockRef = useRef(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [historyPreview, setHistoryPreview] = useState<{
        entry: SalesHistoryEntry;
        record: NewSalesFormRecord;
    } | null>(null);
    const [restoredHistoryEntry, setRestoredHistoryEntry] =
        useState<SalesHistoryEntry | null>(null);
    const [busyHistoryId, setBusyHistoryId] = useState<number | null>(null);
	const legacyInventoryAdaptation = useLegacyInventoryAdaptationTask();
    const [usePackageWorkflowPanel] = useState(
        resolveInitialPackageWorkflowPanelEnabled,
    );
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
    const setSpecialOrder = useNewSalesFormStore((s) => s.setSpecialOrder);
    const editor = useNewSalesFormStore((s) => s.editor);
    const setEditor = useNewSalesFormStore((s) => s.setEditor);
    const setMeta = useNewSalesFormStore((s) => s.setMeta);
    const [recoverySnapshot, setRecoverySnapshot] =
        useState<NewSalesFormRecoverySnapshot | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
	const [customerPromptDismissed, setCustomerPromptDismissed] = useState(false);
    const [bootstrapCustomerId] = useState<number | null>(() =>
        normalizeSalesFormInitialCustomerId(draftParams.selectedCustomerId),
    );
    const lastHydratedLoadKeyRef = useRef<string | null>(null);

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
    const customerPromptOpen =
        props.mode === "create" &&
        !!record &&
        !record.form.customerId &&
        !customerPromptDismissed;
    const isSaved = Boolean(record?.salesId && record?.orderId);
    const isOrder = props.type === "order";
    const salesFormCapabilities = useSalesFormCapabilities(props.type);
    const salesFormPermissions = useSalesFormPermissions(props.type);
    const actorId = Number(auth.id || 0) > 0 ? Number(auth.id) : 1;
    const actorName = auth.name || "System";

    function handleCustomerPromptOpenChange(open: boolean) {
        setCustomerPromptDismissed(!open);
    }

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
				((dispatchOverview.data?.deliveries as PackingDispatch[] | undefined) ||
					[]) as PackingDispatch[]
            )
                .filter(
                    (dispatch) =>
                        !dispatch.deliveryMode ||
						String(dispatch.deliveryMode).toLowerCase() === "pickup",
                )
                .sort((left, right) => right.id - left.id),
        [dispatchOverview.data?.deliveries],
    );
    const activePackingDispatch = useMemo(
        () =>
            packingDispatches.find(
                (dispatch) =>
					dispatch.status !== "completed" && dispatch.status !== "cancelled",
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
								queryKey: trpc.dispatch.orderDispatchOverview.queryKey({
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
		const shouldHydrate = !record || lastHydratedLoadKeyRef.current !== loadKey;
        if (!shouldHydrate) return;
        lastHydratedLoadKeyRef.current = loadKey;
        hydrate(loadData as NewSalesFormRecord);
    }, [loadData, hydrate, record, props.mode, props.type]);

    const payload = useMemo(() => {
        if (!record) return null;
        return toSaveDraftInput(record, true);
    }, [record]);
	const loadedChangeProtection = (
		loadData as
			| {
					changeProtection?: {
						paymentTotal: number;
						paymentCount: number;
						refundablePaymentCount: number;
						allocatedQty: number;
						inboundQty: number;
						productionQty: number;
						fulfilledQty: number;
						lines: Array<{
							uid: string;
							salesOrderItemId: number;
							allocatedQty: number;
							inboundQty: number;
						}>;
					};
					activeAdjustment?: {
						id: string;
						status: string;
						direction: string;
					} | null;
			  }
			| null
			| undefined
	)?.changeProtection;
	const activeAdjustment = (
		loadData as
			| {
					activeAdjustment?: {
						id: string;
						status: string;
						direction: string;
					} | null;
			  }
			| null
			| undefined
	)?.activeAdjustment;
	const localChangeAnalysis = useMemo(() => {
		if (
			props.mode !== "edit" ||
			props.type !== "order" ||
			!record ||
			!loadData ||
			!loadedChangeProtection
		) {
			return null;
		}
		return analyzeSalesFormChange({
			before: loadData,
			after: record,
			commitments: loadedChangeProtection,
		});
	}, [loadData, loadedChangeProtection, props.mode, props.type, record]);
	const hasSalesRepApprovalChange = Boolean(
		localChangeAnalysis?.requiresSalesRepApproval,
	);
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
		enabled: !!record && editor.autosaveEnabled && !hasSalesRepApprovalChange,
        dirty,
        payload,
        onSaving: () => {
            markSaving();
        },
        onSaved: (resp, _savedPayload, hasPendingChanges) => {
            patchRecord({
                salesId: resp?.salesId,
                slug: resp?.slug,
                orderId: resp?.orderId,
                status: resp?.status,
                specialOrder: resp?.specialOrder,
				...(!hasPendingChanges
					? {
							lineItems: resp?.lineItems,
							extraCosts: resp?.extraCosts,
							summary: resp?.summary,
							form: resp?.form,
						}
					: {}),
            });
            markSaved({
                version: resp?.version,
                updatedAt: resp?.updatedAt || new Date().toISOString(),
                preserveDirty: hasPendingChanges,
            });
            setRestoredHistoryEntry(null);
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
	const previewAdjustmentMutation = useMutation(
		trpc.newSalesForm.previewAdjustment.mutationOptions(),
	);
	const createAdjustmentMutation = useMutation(
		trpc.newSalesForm.createAdjustment.mutationOptions(),
	);
    const taskTrigger = useTaskTrigger({
        silent: true,
        monitor: true,
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: trpc.sales.getSalesHx.pathKey(),
            });
        },
    });
    const isSaveBusy =
		manualSaveLock ||
		autosave.isSaving ||
		finalSave.isPending ||
		previewAdjustmentMutation.isPending ||
		createAdjustmentMutation.isPending ||
		isApplyingAdjustment;
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
				oldStatus: normalizeDispatchStatus(currentPackingDispatch.status),
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
            saveScope?: NewSalesFormSaveScope | null;
            specialOrder?: NewSalesFormRecord["specialOrder"];
			lineItems?: NewSalesFormRecord["lineItems"];
			extraCosts?: NewSalesFormRecord["extraCosts"];
			summary?: NewSalesFormRecord["summary"];
			form?: NewSalesFormRecord["form"];
        }) => {
            patchRecord({
                salesId: resp?.salesId,
                slug: resp?.slug,
                orderId: resp?.orderId,
                inventoryStatus: resp?.inventoryStatus,
                status: resp?.status,
                specialOrder: resp?.specialOrder,
				lineItems: resp?.lineItems,
				extraCosts: resp?.extraCosts,
				summary: resp?.summary,
				form: resp?.form,
            });
            markSaved({
                version: resp?.version,
                updatedAt: resp?.updatedAt || new Date().toISOString(),
            });
            clearRecoveryKeys({
                slug: resp?.slug,
                salesId: resp?.salesId,
            });
			if (isLegacyPoOnlySaveResponse(resp)) return;

            if (resp?.orderId && resp?.type) {
                taskTrigger.triggerWithAuth("create-sales-history", {
                    salesNo: resp.orderId,
                    salesType: resp.type,
                } as CreateSalesHistorySchemaTask);
            }
            if (resp?.type === "order" && resp?.salesId && resp?.orderId) {
                await resetSalesStatAction(resp.salesId, resp.orderId);
                await salesQueryClient.events.productionUpdated({
                    orderNo: resp.orderId,
                    salesId: resp.salesId,
                    salesType: "order",
                });
            }
            if (resp?.salesId) {
                await triggerEvent(
                    resp?.isNew ? "salesCreated" : "salesUpdated",
                    resp.salesId,
                );
            }
        },
        [clearRecoveryKeys, markSaved, patchRecord, salesQueryClient, taskTrigger],
    );

    const continueToInventoryAfterSave = useCallback(
		async (
			resp: {
			salesId?: number | null;
				orderId?: string | null;
				type?: "order" | "quote" | null;
				inventoryStatus?: string | null;
				updatedAt?: string | null;
			saveScope?: NewSalesFormSaveScope | null;
			},
			afterSuccessfulSave: boolean,
		) => {
			if (!isOrder) return false;
			const action = resolveLegacyInventoryPostSaveAction({
				salesId: resp.salesId,
				orderNo: resp.orderId,
				salesType: resp.type || props.type,
				inventoryStatus: resp.inventoryStatus,
				savedOrderUpdatedAt: resp.updatedAt,
				afterSuccessfulSave,
				skipOrdinaryInventoryContinuation: isLegacyPoOnlySaveResponse(resp),
			});
			if (action.action === "queue_legacy_adaptation") {
				await legacyInventoryAdaptation.queue(action);
				return false;
			}
			if (action.action === "open_inventory_overview") {
				router.push(
					buildSalesOverviewUrl(action.orderNo, "sales", {
						salesTab: "inventory",
					}),
				);
				return true;
			}
			return false;
        },
		[
			isOrder,
			legacyInventoryAdaptation,
			props.type,
			router,
		],
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

    async function loadHistorySnapshot(entry: SalesHistoryEntry) {
        if (!record?.salesId) {
            throw new Error("Save this form before opening its history.");
        }
        if (historyPreview?.entry.id === entry.id) {
            return historyPreview.record;
        }
        const result = await queryClient.fetchQuery(
            trpc.newSalesForm.getHistorySnapshot.queryOptions({
                type: props.type,
                salesId: record.salesId,
                historyId: entry.id,
            }),
        );
        return result.record as NewSalesFormRecord;
    }

    async function handlePreviewHistoryEntry(entry: SalesHistoryEntry) {
        setBusyHistoryId(entry.id);
        try {
            const snapshot = await loadHistorySnapshot(entry);
            setHistoryPreview({
                entry,
                record: snapshot,
            });
            setEditor({ showMobileSummary: false });
        } catch (error) {
            toast({
                title: "Unable to preview this version",
				description: getErrorMessage(error, "Refresh the form and try again."),
                variant: "destructive",
            });
        } finally {
            setBusyHistoryId(null);
        }
    }

    async function handleRestoreHistoryEntry(entry: SalesHistoryEntry) {
        if (!record) return;
        if (
            dirty &&
            !window.confirm(
                "Restore this saved version? Current unsaved changes will be replaced.",
            )
        ) {
            return;
        }

        setBusyHistoryId(entry.id);
        try {
            const snapshot = await loadHistorySnapshot(entry);
            const currentRecord = useNewSalesFormStore.getState().record;
            if (!currentRecord) return;
            restoreLocalDraft(
                createSalesHistoryRestoreRecord(currentRecord, snapshot),
            );
            setHistoryPreview(null);
            setRestoredHistoryEntry(entry);
            setEditor({ showMobileSummary: false });
            toast({
                title: "History version restored",
                description:
                    "Review the restored version, then save to make it current.",
                variant: "success",
            });
        } catch (error) {
            toast({
                title: "Unable to restore this version",
				description: getErrorMessage(error, "Refresh the form and try again."),
                variant: "destructive",
            });
        } finally {
            setBusyHistoryId(null);
        }
    }

    function validateBeforeSave() {
        if (historyPreview) {
            toast({
                title: "History preview is read-only",
                description:
                    "Restore this version or return to the current form before saving.",
                variant: "destructive",
            });
            return false;
        }
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

	async function openCommittedChangeReview() {
		if (!record?.salesId || !record.slug || !record.version) return false;
		committedChangeContinuationGuardRef.current.status = "idle";
		committedChangeCreatedRef.current = false;
		setIsAwaitingCommittedChangeApplication(false);
		setChangeReviewOpen(true);
		try {
			const review = await previewAdjustmentMutation.mutateAsync({
				...toSaveDraftInput(record, false),
				type: "order",
				salesId: record.salesId,
				slug: record.slug,
				version: record.version,
				autosave: false,
			});
			setChangeReview(review);
			return true;
		} catch (error) {
			setChangeReviewOpen(false);
			setChangeReview(null);
			toast({
				title: "Unable to review this change",
				description: getErrorMessage(error, "Reload the sale and try again."),
				variant: "destructive",
			});
			return false;
		}
	}

	async function waitForAdjustmentApplication(sourceVersion: string) {
		for (let attempt = 0; attempt < 16; attempt += 1) {
			await new Promise((resolve) => setTimeout(resolve, 750));
			const refreshed = await getQuery.refetch();
			if (refreshed.data?.version && refreshed.data.version !== sourceVersion) {
				return refreshed.data as NewSalesFormRecord;
			}
		}
		return null;
	}

	async function submitCommittedChange(input: {
		inboundDisposition: "CANCEL_OPEN_INBOUND" | "KEEP_IN_WAREHOUSE" | null;
		acknowledgeOperationalImpact: boolean;
	}) {
		if (!record?.salesId || !record.slug || !record.version) return;
		if (committedChangeSubmissionRef.current) return;
		committedChangeSubmissionRef.current = true;
		const sourceVersion = record.version;
		const reasons = changeReview?.analysis.reviewReasons || [];
		const reason = reasons.length
			? `Sales representative approved ${reasons
					.map((value) => value.toLowerCase())
					.join(" and ")} adjustment.`
			: "Sales representative approved the sale adjustment.";
		setIsApplyingAdjustment(true);
		try {
			const submission = await runCommittedChangeSubmission({
				alreadyCreated: committedChangeCreatedRef.current,
				createAdjustment: async () => {
					await createAdjustmentMutation.mutateAsync({
						...toSaveDraftInput(record, false),
						type: "order",
						salesId: record.salesId,
						slug: record.slug,
						version: record.version,
						autosave: false,
						reason,
						inboundDisposition: input.inboundDisposition,
						acknowledgeOperationalImpact: input.acknowledgeOperationalImpact,
					});
				},
				pollForRefreshedRecord: () =>
					waitForAdjustmentApplication(sourceVersion),
			});
			committedChangeCreatedRef.current = submission.alreadyCreated;
			setIsAwaitingCommittedChangeApplication(submission.alreadyCreated);
			const refreshedRecord = submission.refreshedRecord;
			if (!refreshedRecord) {
				toast({
					title: "Approved change is still applying",
					description:
						"The form will stay open. Use Check status to resume after the updated sale appears.",
				});
				return;
			}
			const pendingIntent = pendingCommittedChangeSaveIntent;
			setPendingCommittedChangeSaveIntent(null);
			setChangeReviewOpen(false);
			setChangeReview(null);
			toast({
				title: "Changes committed",
				description: "The sale and affected inventory were updated.",
				variant: "success",
			});
			hydrate(refreshedRecord);
			await continueSaveAfterCommittedChangeReview({
				intent: pendingIntent,
				refreshedRecord,
				promptForSpecialOrderDeclaration,
				executeSaveIntent,
				guard: committedChangeContinuationGuardRef.current,
			});
		} catch (error) {
			toast({
				title: "Unable to approve changes",
				description: getErrorMessage(error, "Please try again."),
				variant: "destructive",
			});
		} finally {
			committedChangeSubmissionRef.current = false;
			setIsApplyingAdjustment(false);
		}
	}

	async function stopForCommittedChangeReview(
		intent: SaveIntent | null = null,
	) {
		if (!hasSalesRepApprovalChange) return false;
		if (intent) setPendingCommittedChangeSaveIntent(intent);
		const opened = await openCommittedChangeReview();
		if (!opened && intent) setPendingCommittedChangeSaveIntent(null);
		return true;
	}

    async function runWithManualSaveLock(action: () => Promise<void>) {
		if (manualSaveLockRef.current || isSaveBusy) return;
		manualSaveLockRef.current = true;
        setManualSaveLock(true);
        try {
            await action();
        } finally {
			manualSaveLockRef.current = false;
            setManualSaveLock(false);
        }
    }

    function promptForSpecialOrderDeclaration(
		intent: SaveIntent,
		candidateRecord: NewSalesFormRecord = record as NewSalesFormRecord,
	) {
		const interruption = resolveSpecialOrderSaveInterruption({
			type: props.type,
			intent,
			declaration: candidateRecord?.specialOrder?.declaration,
			hasCustomerEmail: Boolean(candidateRecord?.customer?.email?.trim()),
			enrollmentAccess: specialOrderEnrollmentState,
		});
		if (interruption === "CONTINUE") return false;
		if (interruption === "ENROLLMENT_ACCESS_PENDING") {
			toast({
				title: "Checking Special Order access",
				description: "Please wait a moment, then save again.",
			});
			return true;
		}
		if (interruption === "ENROLLMENT_ACCESS_ERROR") {
			void specialOrderEnrollmentAccess.refetch();
			toast({
				title: "Unable to verify Special Order access",
				description: "We are retrying. Please save again in a moment.",
				variant: "destructive",
			});
			return true;
		}
		setPendingSpecialOrderCommit(intent);
		return true;
    }

    async function executeSaveIntent(
        intent: SaveIntent,
        recordOverride?: NewSalesFormRecord,
    ) {
        const currentRecord = recordOverride || record;
        if (!currentRecord) return;
        if (intent === "final") {
            markSaving();
            try {
                const resp = await finalSave.mutateAsync({
                    ...toSaveDraftInput(currentRecord, false, "final"),
                    commitIntent: "final",
                    autosave: false,
                });
                await handlePostSaveSuccess(resp);
				const inventoryOverviewOpened =
					await continueToInventoryAfterSave(resp, true);
                await clearSelectedCustomerQuery();
                toast({
                    title: "Saved",
                    description: `${props.type} ${resp?.orderId} has been finalized.`,
                    variant: "success",
                });
				if (inventoryOverviewOpened) return;
                if (props.mode === "create") {
                    const editHref = buildEditHref(resp);
                    if (editHref) router.push(editHref);
                }
            } catch (error) {
                const message = getErrorMessage(error, "Unable to save.");
                if (message.toLowerCase().includes("out of date")) {
                    markStale(message);
                } else markError(message);
                toast({
                    title: "Save failed",
                    description: message || "Unable to save final form.",
                    variant: "destructive",
                });
            }
            return;
        }

        const mustFlush = intent === "draft" || dirty || Boolean(recordOverride);
        if (mustFlush) {
            markSaving();
            const resp = await autosave.flush("manual-flush", {
                force: intent === "draft" || Boolean(recordOverride),
                commitIntent: intent,
                ...(recordOverride
                    ? {
							payloadOverride: toSaveDraftInput(recordOverride, false, intent),
                      }
                    : {}),
            });
            if (!resp) return;
            await handlePostSaveSuccess(resp);
			const inventoryOverviewOpened =
				await continueToInventoryAfterSave(resp, true);
            await clearSelectedCustomerQuery();
            if (intent === "draft") {
				toast({ title: "Draft saved", variant: "success" });
				if (inventoryOverviewOpened) return;
                if (props.mode === "create") {
                    const editHref = buildEditHref(resp);
                    if (editHref) {
                        router.push(editHref);
                        return;
                    }
                }
                return;
            }
			if (inventoryOverviewOpened) return;
        } else {
			const inventoryOverviewOpened =
				await continueToInventoryAfterSave(currentRecord, false);
			if (inventoryOverviewOpened) return;
        }
        router.push(
            intent === "close"
                ? `/sales-book/${props.type === "order" ? "orders" : "quotes"}`
                : `/sales-form/${props.type === "order" ? "create-order" : "create-quote"}`,
        );
    }

    async function completeRequiredSpecialOrderDeclaration(
        declaration: "NO" | "YES",
		reason?: string | null,
    ) {
        const intent = pendingSpecialOrderCommit;
        const currentRecord = useNewSalesFormStore.getState().record;
        if (!intent || !currentRecord) return;
        const nextRecord: NewSalesFormRecord = {
            ...currentRecord,
            specialOrder: {
                ...currentRecord.specialOrder,
                declaration,
				changeReason: reason?.trim() || null,
            },
        };
		setSpecialOrder({
			declaration,
			changeReason: reason?.trim() || null,
		});
        setPendingSpecialOrderCommit(null);
        await runWithManualSaveLock(() => executeSaveIntent(intent, nextRecord));
    }

	async function removeSpecialOrderFromForm(reason?: string | null) {
		const currentRecord = useNewSalesFormStore.getState().record;
		if (!currentRecord?.salesId) return;
		await removeSpecialOrderClassification.mutateAsync({
			salesId: currentRecord.salesId,
			reason: reason?.trim() || null,
		});
		setSpecialOrder({
			declaration: "NO",
			status: "NOT_REQUIRED",
			revision: null,
			currentApprovalId: null,
			currentRequestId: null,
			changeReason: null,
		});
		await salesQueryClient.invalidate.salesList({
			salesId: currentRecord.salesId,
			orderNo: currentRecord.orderId,
			salesType: "order",
		});
		toast({
			title: "Special Order classification removed",
			variant: "success",
		});
	}

    async function runRequestedSave(intent: SaveIntent) {
        await runWithManualSaveLock(async () => {
            if (!record || !validateBeforeSave()) return;
            if (await stopForCommittedChangeReview(intent)) return;
            if (promptForSpecialOrderDeclaration(intent)) return;
            await executeSaveIntent(intent);
        });
    }

    async function saveDraftNow() {
        await runRequestedSave("draft");
    }

    async function saveFinal() {
        await runRequestedSave("final");
    }

    async function saveClose() {
        await runRequestedSave("close");
    }

    async function saveNew() {
        await runRequestedSave("new");
    }

    async function handlePrint(event?: ReactMouseEvent<HTMLButtonElement>) {
        const openInNewTab = event?.shiftKey ?? false;
        await runWithManualSaveLock(async () => {
            if (!record) return;
            if (!validateBeforeSave()) return;
			if (await stopForCommittedChangeReview()) return;
            if (saveStatus === "stale") {
                toast({
                    title: "Print unavailable",
					description: "Reload latest data before printing this form.",
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
			if (await stopForCommittedChangeReview()) return;
            if (saveStatus === "stale") {
                toast({
                    title: "PDF unavailable",
					description: "Reload latest data before downloading this form.",
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
			if (await stopForCommittedChangeReview()) return;
            if (saveStatus === "stale") {
                toast({
                    title: "Preview unavailable",
					description: "Reload latest data before previewing this form.",
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
							description: "Save the latest changes before previewing.",
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
						record.customer?.businessName || record.customer?.name || null,
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

    function handleAddItem() {
        if (historyPreview) {
            toast({
                title: "History preview is read-only",
                description:
                    "Restore this version or return to the current form before editing.",
                variant: "destructive",
            });
            return;
        }
        addLineItem();
    }

	const refreshAfterPayment = useCallback(async () => {
		const refreshed = await getQuery.refetch();
		if (refreshed.data) {
			patchRecord({ paymentTotal: refreshed.data.paymentTotal });
		}
	}, [getQuery, patchRecord]);

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
		Number(record.summary.grandTotal || 0) - Number(record.paymentTotal || 0),
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
				onPaymentApplied={refreshAfterPayment}
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
				onPaymentApplied={refreshAfterPayment}
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
            customerId={customerId}
            salesIds={salesIds}
            type={props.type}
            orderNo={record.orderId}
            customerEmail={customer?.email ?? null}
            customerPhone={customer?.phoneNo ?? null}
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
            customerId={customerId}
            salesIds={salesIds}
            type={props.type}
            orderNo={record.orderId}
            customerEmail={customer?.email ?? null}
            customerPhone={customer?.phoneNo ?? null}
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
            <SalesFormAdoptionTracker
                surface="new"
                type={props.type}
                mode={props.mode}
            />
			<SalesChangeReviewSheet
				open={changeReviewOpen}
				onOpenChange={(open) => {
					setChangeReviewOpen(open);
					if (!open && !isApplyingAdjustment) {
						setPendingCommittedChangeSaveIntent(null);
						setChangeReview(null);
						committedChangeContinuationGuardRef.current.status = "idle";
						committedChangeCreatedRef.current = false;
						setIsAwaitingCommittedChangeApplication(false);
					}
				}}
				review={changeReview}
				isLoading={previewAdjustmentMutation.isPending}
				isSubmitting={
					createAdjustmentMutation.isPending || isApplyingAdjustment
				}
				isAwaitingApplication={isAwaitingCommittedChangeApplication}
				onSubmit={submitCommittedChange}
			/>
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
                grandTotal={
                    historyPreview?.record.summary.totalWithCcc ??
                    historyPreview?.record.summary.grandTotal ??
                    record.summary.totalWithCcc ??
                    record.summary.grandTotal
                }
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
                    setEditor({
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
                            initialPrompt
                            mode={props.mode}
                            open={customerPromptOpen}
                            onOpenChange={handleCustomerPromptOpenChange}
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
                    RecoveryBanner:
                        historyPreview ||
                        restoredHistoryEntry ||
						(SHOW_LOCAL_RECOVERY_ALERT && recoverySnapshot) ||
						hasSalesRepApprovalChange ||
						activeAdjustment ? (
                            <div className="m-4 space-y-2 sm:m-6 lg:m-8">
								{loadedChangeProtection && hasSalesRepApprovalChange ? (
									<output className="flex flex-col gap-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950 shadow-sm md:flex-row md:items-center md:justify-between">
										<div className="min-w-0">
											<div className="flex flex-wrap items-center gap-2">
												<p className="font-semibold">
													Review required before saving
												</p>
												{localChangeAnalysis?.reviewReasons.includes(
													"REFUND",
												) ? (
													<Badge variant="outline">Wallet refund</Badge>
												) : null}
												{localChangeAnalysis?.reviewReasons.includes(
													"INBOUND",
												) ? (
													<Badge variant="outline">
														Inbound {loadedChangeProtection.inboundQty}
													</Badge>
												) : null}
												{localChangeAnalysis?.reviewReasons.includes(
													"INVENTORY",
												) ? (
													<Badge variant="outline">
														Allocated {loadedChangeProtection.allocatedQty}
													</Badge>
												) : null}
											</div>
											<p className="mt-1 text-xs opacity-80">
												This change creates a refund or affects material already
												inbound/allocated. Approving commits it automatically.
											</p>
											{activeAdjustment ? (
												<p className="mt-1 text-xs font-medium">
													Adjustment {activeAdjustment.direction.toLowerCase()}{" "}
													·{" "}
													{activeAdjustment.status
														.replaceAll("_", " ")
														.toLowerCase()}
												</p>
											) : null}
										</div>
										<Button
											size="sm"
											disabled={Boolean(activeAdjustment)}
											onClick={() => void openCommittedChangeReview()}
										>
											Review changes
										</Button>
									</output>
								) : null}
								{historyPreview ? (
									<output className="flex flex-col gap-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950 shadow-sm md:flex-row md:items-center md:justify-between">
                                        <div className="flex items-start gap-2">
                                            <Icons.History className="mt-0.5 size-4 shrink-0" />
                                            <div>
                                                <p className="font-semibold">
                                                    Previewing saved history
                                                </p>
                                                <p className="text-xs text-amber-800">
                                                    {new Date(
                                                        historyPreview.entry.createdAt,
                                                    ).toLocaleString()}
                                                    {historyPreview.entry.authorName
                                                        ? ` · ${historyPreview.entry.authorName}`
                                                        : ""}
                                                    . This view is read-only.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
												onClick={() => setHistoryPreview(null)}
                                            >
                                                Return to current
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() =>
													void handleRestoreHistoryEntry(historyPreview.entry)
                                                }
                                            >
                                                Restore this version
                                            </Button>
                                        </div>
									</output>
                                ) : null}
                                {restoredHistoryEntry ? (
									<output className="flex flex-col gap-3 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-950 md:flex-row md:items-center md:justify-between">
                                        <div className="flex items-start gap-2">
                                            <Icons.History className="mt-0.5 size-4 shrink-0" />
                                            <div>
												<p className="font-semibold">Restored from history</p>
                                                <p className="text-xs text-blue-800">
                                                    Version from{" "}
                                                    {new Date(
                                                        restoredHistoryEntry.createdAt,
                                                    ).toLocaleString()}{" "}
													is loaded as unsaved changes. Save to make it current.
                                                </p>
                                            </div>
                                        </div>
									</output>
                                ) : null}
								{SHOW_LOCAL_RECOVERY_ALERT && recoverySnapshot ? (
                                    <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
                                        <p>
                                            Unsaved local edits were found from{" "}
											{new Date(recoverySnapshot.savedAt).toLocaleString()}.
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
											<Button size="sm" onClick={applyRecoverySnapshot}>
                                                Restore
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null,
                    MainPanel: historyPreview ? (
						<SalesHistorySnapshotPreview record={historyPreview.record} />
                    ) : usePackageWorkflowPanel ? (
                        <DashboardSalesFormWorkflowPanel />
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
                            onAddItem={handleAddItem}
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
							canEnrollSpecialOrder={canEnrollSpecialOrder}
                            canEditCustomer={
                                salesFormPermissions.canEditCustomer &&
								!(record as { dealerProfileCard?: unknown }).dealerProfileCard
                            }
                            historyRestoreActive={Boolean(restoredHistoryEntry)}
                            requiredSpecialOrderPromptOpen={
                                pendingSpecialOrderCommit !== null
                            }
                            onRequiredSpecialOrderPromptOpenChange={(open) => {
                                if (!open) setPendingSpecialOrderCommit(null);
                            }}
							onRequiredSpecialOrderDecision={(declaration, reason) =>
                                void completeRequiredSpecialOrderDeclaration(
                                    declaration,
									reason,
                                )
                            }
							onRemoveSpecialOrderClassification={removeSpecialOrderFromForm}
                            mode={props.mode}
                            type={props.type}
                        />
                    ),
                    SalesHistoryPanel: salesFormCapabilities.salesHistory ? (
                        <SalesHistory
                            salesNo={record.orderId}
                            activeHistoryId={historyPreview?.entry.id}
                            busyHistoryId={busyHistoryId}
							onPreview={(entry) => void handlePreviewHistoryEntry(entry)}
							onRestore={(entry) => void handleRestoreHistoryEntry(entry)}
                        />
                    ) : undefined,
                }}
            >
                <SalesFormHeaderActions
                    type={props.type}
                    orderId={record.orderId}
					createdAt={record.form.createdAt}
                    saveStatus={saveStatus}
                    dirty={dirty}
                    lastSavedAt={lastSavedAt}
                    statusMessage={lastSaveError}
                    isSaving={isSaveBusy}
                    versionSwitcherSlot={
                        <SalesFormVersionSwitcher
                            currentForm="new"
                            type={props.type}
                            mode={props.mode}
                            slug={record.slug || props.slug}
                        />
                    }
                    autosaveEnabled={editor.autosaveEnabled}
                    stepDisplayMode={editor.stepDisplayMode}
                    onAddItem={handleAddItem}
                    onToggleStepDisplay={() =>
                        setEditor({
                            stepDisplayMode:
								editor.stepDisplayMode === "extended" ? "compact" : "extended",
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
						activePackingDispatch ? "Packing sent" : "Packing"
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
					activeItem={editor.activeItem || record.lineItems[0]?.uid || null}
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
