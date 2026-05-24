"use client";

import { FileUploader } from "@/components/common/file-uploader";
import { MouldingCalculator } from "@/components/moulding-calculator";
import { env } from "@/env.mjs";
import { useAuth } from "@/hooks/use-auth";
import { endFlow, logStage, startFlow } from "@/lib/dev-flow-logger";
import {
    buildSelectedByStepUid,
    buildSelectedProdUidsByStepUid,
    deriveDoorSizeCandidates,
    findLineStepByTitle,
    getRedirectableRoutes,
    getSelectedDoorComponentsForLine,
    getSelectedProdUids,
    isComponentVisibleByRules,
    isMouldingItem,
    normalizeSalesFormTitle as normalizeTitle,
    resolveComponentPriceByDeps,
    resolveDoorTierPricing,
    getRouteConfigForLine as resolveRouteConfigForLine,
    summarizeDoors,
} from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import { Menu } from "@gnd/ui/custom/menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    useCustomerProfilesQuery,
    useNewSalesFormShelfCategoriesQuery,
    useNewSalesFormShelfProductsQuery,
    useNewSalesFormStepRoutingQuery,
    useSalesDeleteSupplierMutation,
    useSalesSaveSupplierMutation,
    useSalesStepComponentsQuery,
    useSalesSuppliersQuery,
    useSalesUpdateStepMetaMutation,
    useUpdateDykeComponentPricingMutation,
} from "../api";
import type { NewSalesFormLineItem } from "../schema";
import { useNewSalesFormStore } from "../store";
import { createWwwWorkflowAdminCapabilities } from "./workflow-capabilities";
import {
    applyWorkflowComponentPriceOverride,
    buildShelfProductsById,
    buildStepComponentOverrideMap,
    buildInitialWorkflowShelfPatch,
    buildWorkflowDoorRowsPatch,
    buildWorkflowDoorSizeVariantPatch,
    buildWorkflowComponentEditState,
    buildWorkflowDoorSyncPatch,
    buildWorkflowMouldingRowsContext,
    buildWorkflowMouldingRowsPatch,
    buildWorkflowServiceRowsContext,
    buildWorkflowServiceRowsPatch,
    buildWorkflowShelfSyncPatch,
    buildWorkflowShelfSectionsContext,
    buildWorkflowShelfSectionsPatch,
    clearUnpricedDoorRowQty,
    componentLabel,
    computeSharedDoorSurcharge,
    createShelfProductDraft,
    createShelfSectionDraft,
    CustomerProfileRecord,
    DoorStoredRow,
    DoorSupplierManager,
    DoorStepPanel,
    firstFiniteNumber,
    getDoorSupplierMeta,
    getItemWorkflowStepFamily,
    getLineTitlePlaceholder,
    getShelfLeafCategoryIds,
    getShelfRowBasePrice,
    getShelfRowDisplayTotal,
    getShelfRowDisplayUnitPrice,
    getShelfRowSalesPrice,
    getStepPriceDeps,
    getWorkflowSteps,
    HousePackageToolPanel,
    isComponentEnabledForView,
    isDoorStepTitle,
    isHousePackageToolStepTitle,
    isMultiSelectStepTitle,
    isRedirectDisabledStep,
    lineItemPickerLabel,
    MouldingRow,
    MouldingLineItemsEditor,
    money,
    moneyIfPositive,
    normalizeStoredDoorRows,
    profileAdjustedSalesPrice,
    profileAdjustedDoorSalesPrice,
    removeWorkflowHptDoorOption,
    removeWorkflowMouldingSelection,
    removeWorkflowSelectedComponent,
    resolveInteractiveStepIndex,
    RootComponentPicker,
    saveWorkflowSelectedComponent,
    saveWorkflowComponentEdit,
    ServiceLineItemsEditor,
    ServiceRow,
    selectAllWorkflowComponents,
    ShelfCategoryPathInput,
    ShelfCategoryRecord,
    ShelfItemRow,
    ShelfProductCombobox,
    ShelfProductOption,
    ShelfProductRecord,
    ShelfRowDraft,
    ShelfSectionDraft,
    selectWorkflowRootComponent,
    setWorkflowComponentRedirect,
    stepKey,
    swapWorkflowDoorComponent,
    updateWorkflowDoorSupplier,
    WorkflowComponentRecord,
    WorkflowComponentEditState,
    WorkflowComponentPreview,
    WorkflowComponentToolbar,
    ComponentEditDialog,
    DoorSizeQtyDialog,
    DoorSizeVariantDialog,
    DoorSwapDialog,
    MouldingCalculatorDialog,
    useItemWorkflowController,
    useMouldingWorkflow,
    WorkflowLineList,
    getWorkflowLineDisplayTotal,
    WorkflowShelfPanel,
    WorkflowStepComponentPanel,
    WorkflowStepRenderer,
    WorkflowStepRecord,
    resolveWorkflowVisibleComponents,
    proceedWorkflowMultiSelectStep,
} from "@gnd/sales/sales-form";

type WorkflowStep = WorkflowStepRecord;
type WorkflowComponent = WorkflowComponentRecord;
type StepComponentLike = WorkflowComponentRecord;
function resolveComponentImageSrc(src?: string | null) {
    const value = String(src || "").trim();
    if (!value) return null;
    if (
        value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("data:") ||
        value.startsWith("blob:")
    ) {
        return value;
    }
    const base = String(env.NEXT_PUBLIC_CLOUDINARY_BASE_URL || "").replace(
        /\/$/,
        "",
    );
    const normalized = value.replace(/^\//, "");
    if (!base) return normalized;
    if (normalized.startsWith("dyke/")) return `${base}/${normalized}`;
    return `${base}/dyke/${normalized}`;
}

export function ItemWorkflowPanel() {
    const auth = useAuth();
    const record = useNewSalesFormStore((s) => s.record);
    const updateLineItem = useNewSalesFormStore((s) => s.updateLineItem);
    const removeLineItem = useNewSalesFormStore((s) => s.removeLineItem);
    const editor = useNewSalesFormStore((s) => s.editor);
    const setEditor = useNewSalesFormStore((s) => s.setEditor);

    const [activeStepByLine, setActiveStepByLine] = useState<
        Record<string, number>
    >({});
    const [isMouldingDialogOpen, setIsMouldingDialogOpen] = useState(false);
    const [doorStepModal, setDoorStepModal] = useState<{
        open: boolean;
        component: WorkflowComponent | null;
    }>({
        open: false,
        component: null,
    });
    const [doorSectionTab, setDoorSectionTab] = useState<"doors" | "suppliers">(
        "doors",
    );
    const [activeHptDoorUidByLine, setActiveHptDoorUidByLine] = useState<
        Record<string, string>
    >({});
    const [doorSwapModal, setDoorSwapModal] = useState<{
        open: boolean;
        lineUid: string | null;
        sourceUid: string | null;
    }>({
        open: false,
        lineUid: null,
        sourceUid: null,
    });
    const [componentEditModal, setComponentEditModal] =
        useState<WorkflowComponentEditState>({
            open: false,
            mode: "edit",
            lineUid: null,
            stepIndex: -1,
            componentUid: "",
            componentTitle: "",
            componentImg: "",
            salesPrice: "",
            redirectUid: "",
            overrideMode: false,
            noHandle: false,
            hasSwing: true,
        });
    const [supplierNameInput, setSupplierNameInput] = useState("");
    const [editingSupplier, setEditingSupplier] = useState<{
        id: number;
        name: string;
    } | null>(null);
    const [includeCustomComponents, setIncludeCustomComponents] =
        useState(false);
    const [doorSizeVariantModal, setDoorSizeVariantModal] = useState<{
        open: boolean;
        lineUid: string | null;
        stepIndex: number;
    }>({
        open: false,
        lineUid: null,
        stepIndex: -1,
    });

    const stepRoutingQuery = useNewSalesFormStepRoutingQuery({});
    const routeData = stepRoutingQuery.data;
    const suppliersQuery = useSalesSuppliersQuery(true);
    const customerProfilesQuery = useCustomerProfilesQuery(true);
    const saveSupplierMutation = useSalesSaveSupplierMutation();
    const deleteSupplierMutation = useSalesDeleteSupplierMutation();
    const updateStepMetaMutation = useSalesUpdateStepMetaMutation();
    const updateDoorPriceMutation = useUpdateDykeComponentPricingMutation();
    const workflowAdminCapabilities = useMemo(
        () => createWwwWorkflowAdminCapabilities(auth.roleTitle),
        [auth.roleTitle],
    );
    const {
        activeLine,
        activeLineSteps,
        activeStepIndex,
        activeStep,
        itemOptions,
    } = useItemWorkflowController({
        lineItems: record.lineItems,
        activeItem: editor.activeItem,
        activeStepByLine,
        resolveActiveStepIndex: resolveInteractiveStepIndex,
        getItemLabel: lineItemPickerLabel,
    });
    const activeDoorStep = activeLine
        ? findLineStepByTitle(activeLine, "Door")
        : null;
    const visibleLineItems = useMemo(() => {
        return record.lineItems.map((line, index) => ({
            line,
            index,
        }));
    }, [record.lineItems]);
    const activeDoorStepIndex = activeLineSteps.findIndex((step) =>
        isDoorStepTitle(step?.step?.title),
    );
    const activeStepComponentOverrides = useMemo(() => {
        const overrides = new Map<string, WorkflowComponent>();
        const selected = Array.isArray(activeStep?.meta?.selectedComponents)
            ? (activeStep.meta.selectedComponents as WorkflowComponent[])
            : [];
        for (const component of selected) {
            const uid = String(component?.uid || "").trim();
            if (!uid) continue;
            overrides.set(uid, component);
        }
        if (String(activeStep?.prodUid || "").trim()) {
            const uid = String(activeStep?.prodUid || "").trim();
            if (!overrides.has(uid)) {
                overrides.set(uid, {
                    uid,
                    title: activeStep?.value || null,
                    salesPrice: activeStep?.price ?? null,
                    basePrice: activeStep?.basePrice ?? null,
                    redirectUid: activeStep?.meta?.redirectUid || null,
                    sectionOverride: activeStep?.meta?.sectionOverride || null,
                });
            }
        }
        return overrides;
    }, [activeStep]);
    const shelfCategoryIds = useMemo(
        () =>
            Array.from(
                new Set(
                    ((activeLine?.shelfItems || []) as ShelfItemRow[])
                        .flatMap((row) => [
                            Number(row?.categoryId || 0),
                            Number(row?.meta?.shelfParentCategoryId || 0),
                            ...(row?.meta?.categoryIds || []).map((value) =>
                                Number(value || 0),
                            ),
                        ])
                        .filter((id) => id > 0),
                ),
            ),
        [activeLine?.shelfItems],
    );
    const shelfCategoriesQuery = useNewSalesFormShelfCategoriesQuery({}, true);
    const shelfProductsQuery = useNewSalesFormShelfProductsQuery(
        { categoryIds: shelfCategoryIds },
        shelfCategoryIds.length > 0,
    );
    const shelfProductsByCategory = useMemo(() => {
        const bucket = new Map<number, ShelfProductRecord[]>();
        for (const product of (shelfProductsQuery.data ||
            []) as ShelfProductRecord[]) {
            const keys = [
                Number(product?.categoryId || 0),
                Number(product?.parentCategoryId || 0),
            ].filter((id) => id > 0);
            for (const key of keys) {
                const list = bucket.get(key) || [];
                list.push(product);
                bucket.set(key, list);
            }
        }
        return bucket;
    }, [shelfProductsQuery.data]);
    const shelfCategories = useMemo(
        () => shelfCategoriesQuery.data || [],
        [shelfCategoriesQuery.data],
    );
    const [pendingShelfClear, setPendingShelfClear] = useState<{
        sectionUid: string;
        scope: "category" | "section";
    } | null>(null);
    const [componentSearch, setComponentSearch] = useState("");
    const shelfParentCategories = useMemo(
        () =>
            shelfCategories.filter(
                (category: ShelfCategoryRecord) =>
                    String(category?.type || "").toLowerCase() === "parent",
            ),
        [shelfCategories],
    );
    const activeProfileCoefficient = useMemo(() => {
        const selectedProfileId = Number(record?.form?.customerProfileId || 0);
        if (!selectedProfileId) return 1;
        const profile = (
            (customerProfilesQuery.data || []) as CustomerProfileRecord[]
        ).find((cp) => Number(cp?.id || 0) === selectedProfileId);
        const coefficient = Number(profile?.coefficient || 0);
        return Number.isFinite(coefficient) && coefficient > 0
            ? coefficient
            : 1;
    }, [customerProfilesQuery.data, record?.form?.customerProfileId]);
    const activeShelfSync = useMemo(() => {
        return buildWorkflowShelfSyncPatch(
            activeLine,
            activeProfileCoefficient,
        );
    }, [activeLine, activeProfileCoefficient]);
    useEffect(() => {
        if (!activeShelfSync) return;
        const { rowsChanged, qtyChanged, unitPriceChanged, totalChanged } =
            activeShelfSync.changed;
        const flow = startFlow({
            feature: "new-sales-form/shelf",
            threadContext: "active-shelf-sync",
            tags: ["debug", "dev-only", "shelf"],
            inputs: {
                lineUid: activeShelfSync.lineUid,
                rowsChanged,
                qtyChanged,
                unitPriceChanged,
                totalChanged,
            },
        });
        logStage(flow, {
            stage: "derive",
            eventType: "payload.transformed",
            outputs: {
                qty: activeShelfSync.qty,
                unitPrice: activeShelfSync.unitPrice,
                lineTotal: activeShelfSync.lineTotal,
            },
        });
        updateLineItem(
            activeShelfSync.lineUid,
            activeShelfSync.linePatch as Partial<NewSalesFormLineItem>,
        );
        endFlow(flow, {
            lineUid: activeShelfSync.lineUid,
        });
    }, [activeShelfSync, updateLineItem]);
    useEffect(() => {
        const initialShelfPatch = buildInitialWorkflowShelfPatch(
            activeLine,
            activeProfileCoefficient,
        );
        if (!initialShelfPatch) return;
        updateLineItem(
            initialShelfPatch.lineUid,
            initialShelfPatch.linePatch as Partial<NewSalesFormLineItem>,
        );
    }, [activeLine, activeProfileCoefficient, updateLineItem]);
    const stepComponentsQuery = useSalesStepComponentsQuery(
        {
            stepId: activeStep?.stepId || activeStep?.step?.id,
            stepTitle: activeStep?.step?.title || null,
        },
        !!activeStep,
    );
    const rootStepId = routeData?.rootStepUid
        ? routeData?.stepsByUid?.[routeData.rootStepUid]?.id
        : null;
    const rootComponentsQuery = useSalesStepComponentsQuery(
        {
            stepId: rootStepId || undefined,
            stepTitle: null,
        },
        !!rootStepId,
    );
    const doorStepComponentsQuery = useSalesStepComponentsQuery(
        {
            stepId: activeDoorStep?.stepId || activeDoorStep?.step?.id,
            stepTitle: activeDoorStep?.step?.title || null,
        },
        !!activeDoorStep,
    );
    const activeDoorStepComponentOverrides = useMemo(
        () => buildStepComponentOverrideMap(activeDoorStep || null),
        [activeDoorStep],
    );

    const visibleComponents = useMemo(() => {
        return resolveWorkflowVisibleComponents({
            components: stepComponentsQuery.data || [],
            steps: activeLineSteps,
            activeStep: activeStep || null,
            overrides: activeStepComponentOverrides,
            includeCustomComponents,
            profileCoefficient: activeProfileCoefficient,
        });
    }, [
        stepComponentsQuery.data,
        activeStep,
        activeLineSteps,
        includeCustomComponents,
        activeProfileCoefficient,
        activeStepComponentOverrides,
    ]);
    const visibleDoorComponents = useMemo(() => {
        return resolveWorkflowVisibleComponents({
            components: doorStepComponentsQuery.data || [],
            steps: activeLineSteps,
            activeStep: activeDoorStep || null,
            overrides: activeDoorStepComponentOverrides,
            includeCustomComponents,
            profileCoefficient: activeProfileCoefficient,
        });
    }, [
        doorStepComponentsQuery.data,
        activeLineSteps,
        includeCustomComponents,
        activeProfileCoefficient,
        activeDoorStepComponentOverrides,
        activeDoorStep,
    ]);
    const activeDoorSync = useMemo(() => {
        return buildWorkflowDoorSyncPatch({
            line: activeLine,
            routeData,
            availableComponents: visibleDoorComponents,
            activeDoorUid: activeLine
                ? activeHptDoorUidByLine[activeLine.uid] || null
                : null,
            profileCoefficient: activeProfileCoefficient,
        });
    }, [
        activeHptDoorUidByLine,
        activeLine,
        activeProfileCoefficient,
        routeData,
        visibleDoorComponents,
    ]);
    useEffect(() => {
        if (!activeDoorSync) return;
        updateLineItem(
            activeDoorSync.lineUid,
            activeDoorSync.linePatch as Partial<NewSalesFormLineItem>,
        );
    }, [activeDoorSync, updateLineItem]);
    const activeRootComponents = useMemo(() => {
        const roots = rootComponentsQuery.data || [];
        const configured = new Set(
            Object.keys(routeData?.composedRouter || {}),
        );
        if (!configured.size) return [];
        const selectedByStepUid = buildSelectedByStepUid(activeLineSteps);
        const selectedProdUidsByStepUid =
            buildSelectedProdUidsByStepUid(activeLineSteps);
        return roots
            .filter((component: StepComponentLike) =>
                configured.has(component.uid || ""),
            )
            .filter((component: StepComponentLike) =>
                isComponentEnabledForView(component, includeCustomComponents),
            )
            .filter((component: StepComponentLike) =>
                isComponentVisibleByRules(
                    component,
                    selectedByStepUid,
                    selectedProdUidsByStepUid,
                ),
            )
            .map((component: StepComponentLike) => {
                const override = activeStepComponentOverrides.get(
                    String(component?.uid || ""),
                );
                const price = resolveComponentPriceByDeps(
                    {
                        ...component,
                        ...(override || {}),
                    },
                    selectedByStepUid,
                    {
                        priceStepDeps: getStepPriceDeps(activeStep || null),
                        selectedProdUidsByStepUid,
                    },
                );
                const resolvedBasePrice =
                    override?.basePrice == null
                        ? (price.basePrice ??
                          component?.basePrice ??
                          price.salesPrice ??
                          component?.salesPrice)
                        : override?.basePrice;
                const resolvedSalesPrice =
                    override?.salesPrice == null
                        ? (price.salesPrice ?? component?.salesPrice)
                        : override?.salesPrice;
                return {
                    ...component,
                    ...(override || {}),
                    salesPrice: profileAdjustedSalesPrice(
                        resolvedSalesPrice,
                        resolvedBasePrice,
                        activeProfileCoefficient,
                    ),
                    basePrice: Number(resolvedBasePrice ?? 0),
                };
            });
    }, [
        routeData,
        rootComponentsQuery.data,
        activeLineSteps,
        includeCustomComponents,
        activeProfileCoefficient,
        activeStepComponentOverrides,
        activeStep,
    ]);
    const {
        mouldingSelectionPopover,
        mouldingQtyInputRef,
        openMouldingSelectionQtyPopover,
        saveMouldingSelectionWithQty,
        setMouldingSelectionQty,
        closeMouldingSelectionPopover,
    } = useMouldingWorkflow({
        activeLine,
        activeStep,
        activeStepIndex,
        normalizeTitle,
        visibleComponents,
        updateLineItem,
    });
    const activeDoorSupplier = getDoorSupplierMeta(
        activeDoorStep || activeStep,
    );
    const componentSearchResetKey = `${activeLine?.uid || ""}:${activeStep?.stepId || ""}:${activeStep?.step?.title || ""}`;
    useEffect(() => {
        void componentSearchResetKey;
        setComponentSearch("");
    }, [componentSearchResetKey]);
    if (!record) return null;

    function saveSelectedComponent({
        line,
        steps,
        currentStepIndex,
        component,
        selectedOverride,
    }: {
        line: (typeof record.lineItems)[number];
        steps: WorkflowStep[];
        currentStepIndex: number;
        component: WorkflowComponent;
        selectedOverride?: boolean;
    }) {
        const result = saveWorkflowSelectedComponent({
            routeData,
            line,
            steps,
            currentStepIndex,
            component,
            visibleComponents,
            activeStepTitle: activeStep?.step?.title || "",
            selectedOverride,
        });
        if (!result) return;
        updateLineItem(
            line.uid,
            result.linePatch as Partial<NewSalesFormLineItem>,
        );
        setActiveStepByLine((prev) => ({
            ...prev,
            [line.uid]: result.activeStepIndex,
        }));
    }
    function proceedMultiSelectStep(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
    ) {
        const result = proceedWorkflowMultiSelectStep({
            routeData,
            line,
            stepIndex,
            visibleComponents,
        });
        if (!result) return;
        updateLineItem(
            line.uid,
            result.linePatch as Partial<NewSalesFormLineItem>,
        );
        setActiveStepByLine((prev) => ({
            ...prev,
            [line.uid]: result.activeStepIndex,
        }));
    }

    function selectRootComponent(
        line: (typeof record.lineItems)[number],
        component: WorkflowComponent,
    ) {
        const result = selectWorkflowRootComponent({
            routeData,
            line,
            component,
        });
        if (!result) return;
        updateLineItem(
            line.uid,
            result.linePatch as Partial<NewSalesFormLineItem>,
        );

        setEditor({
            activeItem: line.uid,
        });
        setActiveStepByLine((prev) => ({
            ...prev,
            [line.uid]: result.activeStepIndex,
        }));
    }
    function updateDoorSupplierAtStep(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        supplier?: { uid?: string | null; name?: string | null } | null,
    ) {
        const patch = updateWorkflowDoorSupplier({
            line,
            stepIndex,
            supplier,
            profileCoefficient: activeProfileCoefficient,
        });
        if (patch)
            updateLineItem(line.uid, patch as Partial<NewSalesFormLineItem>);
    }
    function setComponentRedirectUid(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        componentUid: string,
        redirectUid: string | null,
    ) {
        const result = setWorkflowComponentRedirect({
            routeData,
            line,
            stepIndex,
            componentUid,
            redirectUid,
        });
        if (!result) return;
        updateLineItem(
            line.uid,
            result.linePatch as Partial<NewSalesFormLineItem>,
        );
        setActiveStepByLine((prev) => ({
            ...prev,
            [line.uid]: result.activeStepIndex,
        }));
    }
    async function saveDoorSizeVariants(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        variations: unknown[],
    ) {
        const steps = [...getWorkflowSteps(line)];
        const step = steps[stepIndex];
        if (!step) return;
        const nextMeta = {
            ...(step?.meta || {}),
            doorSizeVariation: variations,
        };
        if (step.stepId) {
            await updateStepMetaMutation.mutateAsync({
                stepId: Number(step.stepId),
                meta: nextMeta,
            });
            await stepRoutingQuery.refetch();
        }
        steps[stepIndex] = {
            ...step,
            meta: nextMeta,
        };
        updateLineItem(line.uid, {
            formSteps: steps,
        });
    }
    function swapDoorComponentAtStep(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        sourceComponent: WorkflowComponent,
        targetComponent: WorkflowComponent,
    ) {
        const result = swapWorkflowDoorComponent({
            line,
            stepIndex,
            sourceComponent,
            targetComponent,
            profileCoefficient: activeProfileCoefficient,
        });
        if (!result) return;
        updateLineItem(
            line.uid,
            result.linePatch as Partial<NewSalesFormLineItem>,
        );
        setActiveHptDoorUidByLine((prev) => ({
            ...prev,
            [line.uid]: result.activeDoorUid,
        }));
    }
    function openComponentEditForm(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        component: WorkflowComponent,
        mode: "edit" | "sectionOverride" = "edit",
    ) {
        const nextState = buildWorkflowComponentEditState({
            line,
            stepIndex,
            component,
            mode,
        });
        if (nextState) setComponentEditModal(nextState);
    }
    function saveComponentEditForm() {
        if (!componentEditModal.lineUid || componentEditModal.stepIndex < 0) {
            setComponentEditModal((prev) => ({ ...prev, open: false }));
            return;
        }
        const line = record.lineItems.find(
            (item) => item.uid === componentEditModal.lineUid,
        );
        if (!line) {
            setComponentEditModal((prev) => ({
                ...prev,
                open: false,
                mode: "edit",
            }));
            return;
        }
        const patch = saveWorkflowComponentEdit({
            line,
            state: componentEditModal,
        });
        if (!patch) {
            setComponentEditModal((prev) => ({
                ...prev,
                open: false,
                mode: "edit",
            }));
            return;
        }
        updateLineItem(line.uid, patch as Partial<NewSalesFormLineItem>);
        setComponentEditModal((prev) => ({
            ...prev,
            open: false,
            mode: "edit",
        }));
    }
    function removeSelectedComponentFromStep(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        componentUid: string,
    ) {
        const result = removeWorkflowSelectedComponent({
            line,
            stepIndex,
            componentUid,
        });
        if (!result) return;
        updateLineItem(
            line.uid,
            result.linePatch as Partial<NewSalesFormLineItem>,
        );
        setActiveStepByLine((prev) => ({
            ...prev,
            [line.uid]: result.activeStepIndex,
        }));
    }
    function quickEditComponentPrice(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        component: WorkflowComponent,
    ) {
        if (typeof window === "undefined") return;
        const currentPrice = Number(component?.salesPrice ?? 0);
        const raw = window.prompt(
            "Set line-level component price override",
            currentPrice ? String(currentPrice) : "",
        );
        if (raw == null) return;
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed < 0) return;
        const patch = applyWorkflowComponentPriceOverride({
            line,
            stepIndex,
            component,
            price: parsed,
            fallbackBasePrice: firstFiniteNumber(
                getWorkflowSteps(line)[stepIndex]?.basePrice,
                parsed,
            ),
        });
        if (patch)
            updateLineItem(line.uid, patch as Partial<NewSalesFormLineItem>);
    }
    function removeDoorOptionFromHpt(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        component: WorkflowComponent,
    ) {
        const result = removeWorkflowHptDoorOption({
            routeData,
            line,
            stepIndex,
            component,
        });
        if (!result) return;
        updateLineItem(
            line.uid,
            result.linePatch as Partial<NewSalesFormLineItem>,
        );
        setActiveHptDoorUidByLine((prev) => {
            const next = { ...prev };
            if (result.activeDoorUid) {
                next[line.uid] = result.activeDoorUid;
            } else {
                delete next[line.uid];
            }
            return next;
        });
    }
    function renderHousePackageToolPanel(
        line: (typeof record.lineItems)[number],
        activeItemStep: WorkflowStep,
    ) {
        const rows = (line.housePackageTool?.doors || []).map(
            clearUnpricedDoorRowQty,
        );
        let selectedDoorComponents = getSelectedDoorComponentsForLine(line, {
            availableComponents: visibleDoorComponents,
        });
        if (!selectedDoorComponents.length && rows.length) {
            const recoveredComponentIds = Array.from(
                new Set(rows.map((row) => Number(row?.stepProductId || 0))),
            ) as number[];
            selectedDoorComponents = recoveredComponentIds.map(
                (componentId, index) => {
                    const visibleComponent =
                        componentId > 0
                            ? visibleDoorComponents.find(
                                  (component) =>
                                      Number(component?.id || 0) ===
                                      componentId,
                              )
                            : null;
                    return (
                        visibleComponent || {
                            id: componentId || null,
                            uid: componentId
                                ? `persisted-door-${componentId}`
                                : `persisted-door-${index + 1}`,
                            title: componentId
                                ? `Door ${componentId}`
                                : "Saved Door",
                            img: null,
                            salesPrice: null,
                            basePrice: null,
                            pricing: null,
                            supplierVariants: [],
                        }
                    );
                },
            );
        }
        const doorStepIndex = getWorkflowSteps(line).findIndex((step) =>
            isDoorStepTitle(step?.step?.title),
        );
        const activeDoorUid =
            activeHptDoorUidByLine[line.uid] ||
            selectedDoorComponents[0]?.uid ||
            "";
        const activeDoorComponent =
            selectedDoorComponents.find(
                (component) => component.uid === activeDoorUid,
            ) ||
            selectedDoorComponents[0] ||
            null;
        const routeConfig = resolveRouteConfigForLine({
            routeData,
            line,
            step: activeItemStep,
            component: activeDoorComponent,
        });
        const noHandle = !!routeConfig?.noHandle;
        const hasSwing = !!routeConfig?.hasSwing;
        const summary = summarizeDoors(rows, { noHandle, hasSwing });
        const sharedDoorSurcharge = computeSharedDoorSurcharge(line);
        const doorStep = findLineStepByTitle(line, "Door");
        const supplier = getDoorSupplierMeta(doorStep);
        const matchedFocusedRows = activeDoorComponent
            ? summary.rows.filter(
                  (row) =>
                      Number(row?.stepProductId || 0) ===
                      Number(activeDoorComponent.id || 0),
              )
            : summary.rows;
        const focusedRows =
            activeDoorComponent &&
            !matchedFocusedRows.length &&
            selectedDoorComponents.length === 1 &&
            summary.rows.length
                ? summary.rows
                : matchedFocusedRows;
        const availableSizes = (() => {
            if (!activeDoorComponent) return [] as string[];
            const sizes = deriveDoorSizeCandidates(
                line,
                activeDoorComponent?.pricing || {},
                routeData,
            );
            return sizes.filter((size) => {
                return !focusedRows.some(
                    (row) => String(row?.dimension || "").trim() === size,
                );
            });
        })();
        const swapDoorCandidates = (() => {
            return visibleDoorComponents.filter(
                (component) =>
                    String(component?.uid || "") !==
                    String(activeDoorComponent?.uid || ""),
            );
        })();

        const pricedSteps = getWorkflowSteps(line).filter((step) => {
            const title = normalizeTitle(step?.step?.title);
            return (
                Number(step?.price || 0) > 0 &&
                title !== "item type" &&
                title !== "door" &&
                title !== "house package tool" &&
                title !== "hpt"
            );
        });

        return (
            <HousePackageToolPanel
                selectedDoorComponents={selectedDoorComponents}
                activeDoorUid={activeDoorUid}
                activeDoorComponent={activeDoorComponent}
                focusedRows={focusedRows}
                summary={summary}
                availableSizes={availableSizes}
                pricedSteps={pricedSteps}
                supplierName={supplier.supplierName}
                noHandle={noHandle}
                hasSwing={hasSwing}
                sharedDoorSurcharge={sharedDoorSurcharge}
                profileCoefficient={activeProfileCoefficient}
                canSwapDoor={Boolean(swapDoorCandidates.length)}
                canEditPricing={workflowAdminCapabilities.canEditLinePricing}
                formatMoney={money}
                componentLabel={componentLabel}
                resolveImageSrc={resolveComponentImageSrc}
                onActiveDoorChange={(uid) =>
                    setActiveHptDoorUidByLine((prev) => ({
                        ...prev,
                        [line.uid]: uid,
                    }))
                }
                onAddSize={addSizeRow}
                onConfigureSizes={() =>
                    activeDoorComponent
                        ? setDoorStepModal({
                              open: true,
                              component: activeDoorComponent,
                          })
                        : undefined
                }
                onSwapDoor={() =>
                    setDoorSwapModal({
                        open: true,
                        lineUid: line.uid,
                        sourceUid: activeDoorComponent?.uid || null,
                    })
                }
                onDeleteDoor={() =>
                    activeDoorComponent
                        ? removeDoorOptionFromHpt(
                              line,
                              doorStepIndex,
                              activeDoorComponent,
                          )
                        : undefined
                }
                onPatchRow={patchRow}
                onRemoveSizeRow={removeSizeRow}
            />
        );

        function applyRows(nextRows: typeof summary.rows) {
            const next = buildWorkflowDoorRowsPatch({
                line,
                rows: nextRows,
                sharedDoorSurcharge,
                noHandle,
                hasSwing,
                profileCoefficient: activeProfileCoefficient,
            });
            updateLineItem(
                line.uid,
                next.linePatch as Partial<NewSalesFormLineItem>,
            );
        }

        function patchRow(
            sourceRow: DoorStoredRow,
            patch: Record<string, unknown>,
        ) {
            const nextRows = summary.rows.map((row) =>
                row === sourceRow ? { ...row, ...patch } : row,
            );
            applyRows(nextRows);
        }
        function addSizeRow(size: string) {
            if (!activeDoorComponent) return;
            const pricing = activeDoorComponent?.pricing || {};
            const tierPricing = resolveDoorTierPricing({
                pricing,
                size,
                supplierUid: supplier.supplierUid,
                supplierVariants: activeDoorComponent?.supplierVariants || [],
                salesMultiplier:
                    Number.isFinite(activeProfileCoefficient) &&
                    activeProfileCoefficient > 0
                        ? Number((1 / activeProfileCoefficient).toFixed(2))
                        : 1,
                fallbackSalesPrice: activeDoorComponent?.salesPrice,
                fallbackBasePrice: activeDoorComponent?.basePrice,
            });
            const hasResolvedPrice = Boolean(tierPricing.hasPrice);
            const nextRows = [
                ...summary.rows,
                {
                    id: null,
                    dimension: size,
                    swing: "",
                    doorType: "",
                    doorPrice: 0,
                    jambSizePrice: 0,
                    casingPrice: 0,
                    unitPrice: hasResolvedPrice
                        ? Number(
                              (
                                  tierPricing.salesPrice + sharedDoorSurcharge
                              ).toFixed(2),
                          )
                        : 0,
                    lhQty: 0,
                    rhQty: 0,
                    totalQty: 0,
                    lineTotal: 0,
                    stepProductId: activeDoorComponent.id || null,
                    meta: {
                        baseUnitPrice: hasResolvedPrice
                            ? Number(tierPricing.basePrice.toFixed(2))
                            : 0,
                        priceMissing: !hasResolvedPrice,
                    },
                },
            ];
            applyRows(nextRows);
        }
        function removeSizeRow(sourceRow: DoorStoredRow) {
            const nextRows = summary.rows.filter((row) => row !== sourceRow);
            applyRows(nextRows);
        }
    }

    function renderMouldingLineItemPanel(
        line: (typeof record.lineItems)[number],
    ) {
        const {
            rows,
            selectedMouldings,
            sharedComponentPrice,
            totalQty,
            totalAmount,
        } = buildWorkflowMouldingRowsContext(line);
        function persistRows(nextRowsRaw: MouldingRow[]) {
            updateLineItem(
                line.uid,
                buildWorkflowMouldingRowsPatch({
                    line,
                    rows: nextRowsRaw,
                    sharedComponentPrice,
                }),
            );
        }
        function removeSelectedMoulding(mouldingUid: string) {
            const patch = removeWorkflowMouldingSelection({
                line,
                mouldingUid,
                rows,
                selectedMouldings,
                sharedComponentPrice,
            });
            updateLineItem(line.uid, patch as Partial<NewSalesFormLineItem>);
        }

        return (
            <MouldingLineItemsEditor
                rows={rows}
                totalQty={totalQty}
                totalAmount={totalAmount}
                formatMoney={money}
                componentLabel={componentLabel}
                resolveImageSrc={resolveComponentImageSrc}
                onRowsChange={persistRows}
                onRemoveRow={removeSelectedMoulding}
                renderCalculator={({ row, onCalculate }) => (
                    <MouldingCalculator
                        title={String(row.title || "")}
                        unitPrice={Number(row.estimateUnit || 0)}
                        qty={Number(row.qty || 0)}
                        onCalculate={onCalculate}
                    />
                )}
            />
        );
    }
    function renderServiceLineItemPanel(
        line: (typeof record.lineItems)[number],
    ) {
        const { rows } = buildWorkflowServiceRowsContext(line);

        function persistRows(nextRowsRaw: ServiceRow[]) {
            updateLineItem(
                line.uid,
                buildWorkflowServiceRowsPatch({
                    line,
                    rows: nextRowsRaw,
                }),
            );
        }

        return (
            <ServiceLineItemsEditor
                rows={rows}
                formatMoney={money}
                onRowsChange={persistRows}
                createRow={(nextIndex) => ({
                    uid: `service-${nextIndex}-${Date.now().toString(36)}`,
                    service: "",
                    taxxable: false,
                    produceable: false,
                    qty: 1,
                    unitPrice: 0,
                })}
            />
        );
    }
    function renderItemComponentPanel(
        line: (typeof record.lineItems)[number],
        steps: WorkflowStep[],
        activeIndex: number,
        activeItemStep: WorkflowStep,
    ) {
        const stepFamily = getItemWorkflowStepFamily(line, activeItemStep);
        const isHptStep = isHousePackageToolStepTitle(
            activeItemStep?.step?.title,
        );
        const isRedirectDisabled = isRedirectDisabledStep(activeItemStep);
        const selectedUids = new Set(
            getSelectedProdUids(activeItemStep).map((uid) => String(uid || "")),
        );
        const normalizedComponentSearch = componentSearch.trim().toLowerCase();
        const filteredVisibleComponents = !normalizedComponentSearch
            ? visibleComponents
            : visibleComponents.filter((component) => {
                  const haystack = [
                      component?.title,
                      component?.uid,
                      (component as { value?: string | null })?.value,
                  ]
                      .filter(Boolean)
                      .join(" ")
                      .toLowerCase();
                  return haystack.includes(normalizedComponentSearch);
              });
        const filteredRootComponents = !normalizedComponentSearch
            ? activeRootComponents
            : activeRootComponents.filter((component) => {
                  const haystack = [
                      component?.title,
                      component?.uid,
                      (component as { value?: string | null })?.value,
                  ]
                      .filter(Boolean)
                      .join(" ")
                      .toLowerCase();
                  return haystack.includes(normalizedComponentSearch);
              });
        if (!steps.length) {
            return (
                <RootComponentPicker
                    loading={
                        stepRoutingQuery.isPending ||
                        rootComponentsQuery.isPending
                    }
                    components={activeRootComponents}
                    filteredComponents={filteredRootComponents}
                    search={componentSearch}
                    getKey={(component) => component.uid}
                    renderComponent={(component) => (
                        <button
                            type="button"
                            className="w-full overflow-hidden rounded-xl border bg-card text-left transition hover:border-primary"
                            onClick={() => selectRootComponent(line, component)}
                        >
                            <WorkflowComponentPreview
                                imageSrc={resolveComponentImageSrc(
                                    component.img,
                                )}
                                alt={component.title || component.uid}
                                title={componentLabel(
                                    component.title || component.uid,
                                )}
                                price={moneyIfPositive(component.salesPrice)}
                            />
                        </button>
                    )}
                    toolbarSlot={
                        <WorkflowComponentToolbar
                            count={filteredRootComponents.length}
                            total={activeRootComponents.length}
                            search={componentSearch}
                            maxWidthClassName="max-w-2xl"
                            onSearchChange={setComponentSearch}
                            menuSlot={
                                <>
                                    <Menu.Item
                                        onClick={() => {
                                            void stepComponentsQuery.refetch();
                                            void rootComponentsQuery.refetch();
                                        }}
                                    >
                                        Refresh
                                    </Menu.Item>
                                    <Menu.Item
                                        onClick={() =>
                                            setIncludeCustomComponents(
                                                (prev) => !prev,
                                            )
                                        }
                                    >
                                        Enable Custom:{" "}
                                        {includeCustomComponents ? "On" : "Off"}
                                    </Menu.Item>
                                </>
                            }
                        />
                    }
                />
            );
        }

        return (
            <WorkflowStepRenderer
                stepFamily={stepFamily}
                isHousePackageToolStep={isHptStep}
                isRedirectDisabled={isRedirectDisabled}
                housePackageToolPanel={renderHousePackageToolPanel(
                    line,
                    activeItemStep,
                )}
                redirectDisabledPanel={
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                        This step is skipped by redirect and stays here for
                        context. Continue from{" "}
                        <span className="font-semibold">
                            {activeItemStep?.meta?.redirectTargetUid
                                ? routeData?.stepsByUid?.[
                                      activeItemStep.meta.redirectTargetUid
                                  ]?.title || "the redirected step"
                                : "the redirected step"}
                        </span>
                        .
                    </div>
                }
                componentPickerPanel={
                    <DoorStepPanel
                        title={activeItemStep?.step?.title || "Current Step"}
                        isDoorStep={isDoorStepTitle(
                            activeItemStep?.step?.title,
                        )}
                        activeTab={doorSectionTab}
                        supplierName={
                            getDoorSupplierMeta(activeItemStep).supplierName
                        }
                        onTabChange={setDoorSectionTab}
                    >
                        {stepFamily === "moulding-line-item" ? (
                            renderMouldingLineItemPanel(line)
                        ) : stepFamily === "service-line-item" ? (
                            renderServiceLineItemPanel(line)
                        ) : stepFamily === "shelf" ? (
                            <div className="space-y-3 rounded-lg border p-3">
                                {(() => {
                                    const { sections } =
                                        buildWorkflowShelfSectionsContext(
                                            line,
                                            activeProfileCoefficient,
                                        );
                                    const persistSections = (
                                        nextSections: ShelfSectionDraft[],
                                    ) => {
                                        const flow = startFlow({
                                            feature: "new-sales-form/shelf",
                                            threadContext: "persist-sections",
                                            tags: [
                                                "debug",
                                                "dev-only",
                                                "shelf",
                                            ],
                                            inputs: {
                                                lineUid: line.uid,
                                                sectionCount:
                                                    nextSections.length,
                                            },
                                        });
                                        const next =
                                            buildWorkflowShelfSectionsPatch({
                                                sections: nextSections,
                                                profileCoefficient:
                                                    activeProfileCoefficient,
                                            });
                                        logStage(flow, {
                                            stage: "transform",
                                            eventType: "payload.transformed",
                                            derived: {
                                                flatRows: next.flatRows.map(
                                                    (row: any) => ({
                                                        uid: row?.uid,
                                                        productId:
                                                            row?.productId,
                                                        qty: row?.qty,
                                                        basePrice:
                                                            row?.basePrice,
                                                        salesPrice:
                                                            row?.salesPrice,
                                                        unitPrice:
                                                            row?.unitPrice,
                                                        totalPrice:
                                                            row?.totalPrice,
                                                    }),
                                                ),
                                            },
                                        });
                                        logStage(flow, {
                                            stage: "derive",
                                            eventType: "payload.transformed",
                                            outputs: {
                                                qtyTotal: next.qty,
                                                unitPrice: next.unitPrice,
                                                lineTotal: next.lineTotal,
                                            },
                                        });
                                        updateLineItem(
                                            line.uid,
                                            next.linePatch as Partial<NewSalesFormLineItem>,
                                        );
                                        endFlow(flow, {
                                            lineUid: line.uid,
                                            qtyTotal: next.qty,
                                            unitPrice: next.unitPrice,
                                            lineTotal: next.lineTotal,
                                        });
                                    };
                                    return (
                                        <WorkflowShelfPanel
                                            sections={sections}
                                            onAddSection={() =>
                                                persistSections([
                                                    ...sections,
                                                    createShelfSectionDraft(),
                                                ])
                                            }
                                            renderSection={(
                                                section,
                                                sectionIndex,
                                            ) => {
                                                const categoryIds =
                                                    Array.isArray(
                                                        section?.categoryIds,
                                                    )
                                                        ? section.categoryIds
                                                        : [];
                                                const leafCategoryIds =
                                                    getShelfLeafCategoryIds(
                                                        shelfCategories,
                                                        categoryIds.length
                                                            ? categoryIds[
                                                                  categoryIds.length -
                                                                      1
                                                              ]
                                                            : null,
                                                    );
                                                const productOptions =
                                                    Array.from(
                                                        new Map(
                                                            leafCategoryIds
                                                                .flatMap(
                                                                    (
                                                                        categoryId,
                                                                    ) =>
                                                                        shelfProductsByCategory.get(
                                                                            Number(
                                                                                categoryId ||
                                                                                    0,
                                                                            ),
                                                                        ) || [],
                                                                )
                                                                .map(
                                                                    (
                                                                        product,
                                                                    ) => [
                                                                        Number(
                                                                            product?.id ||
                                                                                0,
                                                                        ),
                                                                        product,
                                                                    ],
                                                                ),
                                                        ).values(),
                                                    ) as ShelfProductOption[];
                                                const productsById =
                                                    buildShelfProductsById(
                                                        productOptions,
                                                    );
                                                const sectionHasSelectedProducts =
                                                    (section?.rows || []).some(
                                                        (row) =>
                                                            Number(
                                                                row?.productId ||
                                                                    0,
                                                            ) > 0,
                                                    );
                                                const patchSection = (
                                                    patch:
                                                        | Partial<ShelfSectionDraft>
                                                        | ((
                                                              section: ShelfSectionDraft,
                                                          ) => ShelfSectionDraft),
                                                ) => {
                                                    persistSections(
                                                        sections.map(
                                                            (
                                                                item,
                                                                i: number,
                                                            ) =>
                                                                i ===
                                                                sectionIndex
                                                                    ? typeof patch ===
                                                                      "function"
                                                                        ? patch(
                                                                              item,
                                                                          )
                                                                        : {
                                                                              ...item,
                                                                              ...patch,
                                                                          }
                                                                    : item,
                                                        ),
                                                    );
                                                };
                                                return (
                                                    <div
                                                        key={`shelf-section-${section.uid}`}
                                                        className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                                                    >
                                                        <Dialog
                                                            open={
                                                                pendingShelfClear?.sectionUid ===
                                                                    section.uid &&
                                                                (pendingShelfClear?.scope ===
                                                                    "category" ||
                                                                    pendingShelfClear?.scope ===
                                                                        "section")
                                                            }
                                                            onOpenChange={(
                                                                open,
                                                            ) => {
                                                                if (!open) {
                                                                    setPendingShelfClear(
                                                                        null,
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <DialogContent className="max-w-sm">
                                                                <DialogHeader>
                                                                    <DialogTitle>
                                                                        Clear
                                                                        Categories
                                                                    </DialogTitle>
                                                                    <DialogDescription>
                                                                        Clearing
                                                                        categories
                                                                        will
                                                                        remove
                                                                        all
                                                                        selected
                                                                        products
                                                                        in this
                                                                        section.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <DialogFooter>
                                                                    <Button
                                                                        variant="secondary"
                                                                        onClick={() =>
                                                                            setPendingShelfClear(
                                                                                null,
                                                                            )
                                                                        }
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                    <Button
                                                                        variant="destructive"
                                                                        onClick={() => {
                                                                            patchSection(
                                                                                {
                                                                                    categoryIds:
                                                                                        [],
                                                                                    parentCategoryId:
                                                                                        null,
                                                                                    categoryId:
                                                                                        null,
                                                                                    rows: [
                                                                                        createShelfProductDraft(),
                                                                                    ],
                                                                                },
                                                                            );
                                                                            setPendingShelfClear(
                                                                                null,
                                                                            );
                                                                        }}
                                                                    >
                                                                        Continue
                                                                    </Button>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                                                Section{" "}
                                                                {sectionIndex +
                                                                    1}
                                                            </p>
                                                            <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700">
                                                                {money(
                                                                    section.subTotal,
                                                                ) || "$0.00"}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="ml-auto"
                                                                onClick={() => {
                                                                    if (
                                                                        sectionHasSelectedProducts
                                                                    ) {
                                                                        setPendingShelfClear(
                                                                            {
                                                                                sectionUid:
                                                                                    String(
                                                                                        section.uid,
                                                                                    ),
                                                                                scope: "section",
                                                                            },
                                                                        );
                                                                        return;
                                                                    }
                                                                    patchSection(
                                                                        {
                                                                            categoryIds:
                                                                                [],
                                                                            parentCategoryId:
                                                                                null,
                                                                            categoryId:
                                                                                null,
                                                                            rows: [
                                                                                createShelfProductDraft(),
                                                                            ],
                                                                        },
                                                                    );
                                                                }}
                                                            >
                                                                Clear
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() =>
                                                                    persistSections(
                                                                        sections.filter(
                                                                            (
                                                                                _,
                                                                                i: number,
                                                                            ) =>
                                                                                i !==
                                                                                sectionIndex,
                                                                        ),
                                                                    )
                                                                }
                                                            >
                                                                Remove Section
                                                            </Button>
                                                        </div>

                                                        <div className="grid gap-2 md:grid-cols-12">
                                                            <div className="md:col-span-6">
                                                                <ShelfCategoryPathInput
                                                                    categories={
                                                                        shelfCategories
                                                                    }
                                                                    categoryIds={
                                                                        categoryIds
                                                                    }
                                                                    onClearRequest={() => {
                                                                        if (
                                                                            sectionHasSelectedProducts
                                                                        ) {
                                                                            setPendingShelfClear(
                                                                                {
                                                                                    sectionUid:
                                                                                        String(
                                                                                            section.uid,
                                                                                        ),
                                                                                    scope: "category",
                                                                                },
                                                                            );
                                                                            return;
                                                                        }
                                                                        patchSection(
                                                                            {
                                                                                categoryIds:
                                                                                    [],
                                                                                parentCategoryId:
                                                                                    null,
                                                                                categoryId:
                                                                                    null,
                                                                                rows: (
                                                                                    section?.rows ||
                                                                                    []
                                                                                ).map(
                                                                                    (
                                                                                        row,
                                                                                    ) => ({
                                                                                        ...row,
                                                                                        categoryId:
                                                                                            null,
                                                                                        productId:
                                                                                            null,
                                                                                        description:
                                                                                            "",
                                                                                        unitPrice: 0,
                                                                                        totalPrice: 0,
                                                                                        meta: {
                                                                                            ...(row?.meta ||
                                                                                                {}),
                                                                                            categoryIds:
                                                                                                [],
                                                                                            shelfParentCategoryId:
                                                                                                null,
                                                                                            basePrice: 0,
                                                                                            salesPrice: 0,
                                                                                            customPrice:
                                                                                                null,
                                                                                        },
                                                                                    }),
                                                                                ),
                                                                            },
                                                                        );
                                                                    }}
                                                                    onChange={(
                                                                        nextCategoryIds,
                                                                    ) =>
                                                                        patchSection(
                                                                            {
                                                                                categoryIds:
                                                                                    nextCategoryIds,
                                                                                parentCategoryId:
                                                                                    nextCategoryIds[0] ??
                                                                                    null,
                                                                                categoryId:
                                                                                    nextCategoryIds.length
                                                                                        ? nextCategoryIds[
                                                                                              nextCategoryIds.length -
                                                                                                  1
                                                                                          ]
                                                                                        : null,
                                                                                rows: (
                                                                                    section?.rows ||
                                                                                    []
                                                                                ).map(
                                                                                    (
                                                                                        row,
                                                                                    ) => ({
                                                                                        ...row,
                                                                                        categoryId:
                                                                                            nextCategoryIds.length
                                                                                                ? nextCategoryIds[
                                                                                                      nextCategoryIds.length -
                                                                                                          1
                                                                                                  ]
                                                                                                : null,
                                                                                        productId:
                                                                                            null,
                                                                                        description:
                                                                                            "",
                                                                                        unitPrice: 0,
                                                                                        totalPrice: 0,
                                                                                        meta: {
                                                                                            ...(row?.meta ||
                                                                                                {}),
                                                                                            categoryIds:
                                                                                                nextCategoryIds,
                                                                                            shelfParentCategoryId:
                                                                                                nextCategoryIds[0] ??
                                                                                                null,
                                                                                            basePrice: 0,
                                                                                            salesPrice: 0,
                                                                                            customPrice:
                                                                                                null,
                                                                                        },
                                                                                    }),
                                                                                ),
                                                                            },
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                            <div className="md:col-span-6 flex items-center justify-end">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        patchSection(
                                                                            (
                                                                                current,
                                                                            ) => ({
                                                                                ...current,
                                                                                rows: [
                                                                                    ...(current?.rows ||
                                                                                        []),
                                                                                    createShelfProductDraft(),
                                                                                ],
                                                                            }),
                                                                        )
                                                                    }
                                                                >
                                                                    Add Product
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="hidden grid-cols-12 gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
                                                                <span className="md:col-span-5">
                                                                    Product
                                                                </span>
                                                                <span className="md:col-span-2 text-right">
                                                                    Price
                                                                </span>
                                                                <span className="md:col-span-1 text-right">
                                                                    Qty
                                                                </span>
                                                                <span className="md:col-span-2 text-right">
                                                                    Total
                                                                </span>
                                                                <span className="md:col-span-1" />
                                                            </div>
                                                            {(
                                                                section?.rows ||
                                                                []
                                                            ).map(
                                                                (
                                                                    row,
                                                                    rowIndex: number,
                                                                ) => (
                                                                    <div
                                                                        key={`shelf-row-${section.uid}-${row.uid || rowIndex}`}
                                                                        className="grid gap-2 rounded-lg border border-white/80 bg-white p-2 md:grid-cols-12"
                                                                    >
                                                                        <div className="md:col-span-5">
                                                                            <ShelfProductCombobox
                                                                                products={
                                                                                    productOptions
                                                                                }
                                                                                value={
                                                                                    row.productId
                                                                                }
                                                                                disabled={
                                                                                    !categoryIds.length
                                                                                }
                                                                                formatMoney={
                                                                                    money
                                                                                }
                                                                                onClearRequest={() =>
                                                                                    patchSection(
                                                                                        (
                                                                                            current,
                                                                                        ) => ({
                                                                                            ...current,
                                                                                            rows: (
                                                                                                current?.rows ||
                                                                                                []
                                                                                            ).map(
                                                                                                (
                                                                                                    item,
                                                                                                    i: number,
                                                                                                ) =>
                                                                                                    i ===
                                                                                                    rowIndex
                                                                                                        ? {
                                                                                                              ...item,
                                                                                                              productId:
                                                                                                                  null,
                                                                                                              description:
                                                                                                                  "",
                                                                                                              basePrice: 0,
                                                                                                              salesPrice: 0,
                                                                                                              customPrice:
                                                                                                                  null,
                                                                                                              unitPrice: 0,
                                                                                                              totalPrice: 0,
                                                                                                              meta: {
                                                                                                                  ...(item?.meta ||
                                                                                                                      {}),
                                                                                                                  basePrice: 0,
                                                                                                                  salesPrice: 0,
                                                                                                                  customPrice:
                                                                                                                      null,
                                                                                                              },
                                                                                                          }
                                                                                                        : item,
                                                                                            ),
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                onChange={(
                                                                                    productId,
                                                                                ) => {
                                                                                    const selectedProduct =
                                                                                        productsById.get(
                                                                                            Number(
                                                                                                productId ||
                                                                                                    0,
                                                                                            ),
                                                                                        ) ||
                                                                                        null;
                                                                                    const resolvedBasePrice =
                                                                                        selectedProduct?.unitPrice ==
                                                                                        null
                                                                                            ? Number(
                                                                                                  row?.basePrice ??
                                                                                                      row
                                                                                                          ?.meta
                                                                                                          ?.basePrice ??
                                                                                                      0,
                                                                                              )
                                                                                            : Number(
                                                                                                  selectedProduct.unitPrice,
                                                                                              );
                                                                                    const resolvedSalesPrice =
                                                                                        selectedProduct?.unitPrice ==
                                                                                        null
                                                                                            ? Number(
                                                                                                  row?.salesPrice ??
                                                                                                      row
                                                                                                          ?.meta
                                                                                                          ?.salesPrice ??
                                                                                                      row?.unitPrice ??
                                                                                                      0,
                                                                                              )
                                                                                            : profileAdjustedDoorSalesPrice(
                                                                                                  null,
                                                                                                  Number(
                                                                                                      selectedProduct.unitPrice,
                                                                                                  ),
                                                                                                  activeProfileCoefficient,
                                                                                              );
                                                                                    const resolvedCustomPrice =
                                                                                        row?.customPrice ??
                                                                                        row
                                                                                            ?.meta
                                                                                            ?.customPrice ??
                                                                                        null;
                                                                                    const resolvedUnitPrice =
                                                                                        resolvedCustomPrice !=
                                                                                        null
                                                                                            ? Number(
                                                                                                  resolvedCustomPrice,
                                                                                              )
                                                                                            : Number(
                                                                                                  resolvedSalesPrice ||
                                                                                                      0,
                                                                                              );
                                                                                    patchSection(
                                                                                        (
                                                                                            current,
                                                                                        ) => ({
                                                                                            ...current,
                                                                                            rows: (
                                                                                                current?.rows ||
                                                                                                []
                                                                                            ).map(
                                                                                                (
                                                                                                    item,
                                                                                                    i: number,
                                                                                                ) =>
                                                                                                    i ===
                                                                                                    rowIndex
                                                                                                        ? {
                                                                                                              ...item,
                                                                                                              categoryId:
                                                                                                                  current?.categoryId ??
                                                                                                                  item?.categoryId ??
                                                                                                                  null,
                                                                                                              productId,
                                                                                                              description:
                                                                                                                  selectedProduct?.title ??
                                                                                                                  item.description,
                                                                                                              basePrice:
                                                                                                                  resolvedBasePrice,
                                                                                                              salesPrice:
                                                                                                                  resolvedSalesPrice,
                                                                                                              customPrice:
                                                                                                                  resolvedCustomPrice,
                                                                                                              unitPrice:
                                                                                                                  resolvedUnitPrice,
                                                                                                              totalPrice:
                                                                                                                  Number(
                                                                                                                      (
                                                                                                                          Number(
                                                                                                                              item?.qty ??
                                                                                                                                  1,
                                                                                                                          ) *
                                                                                                                          resolvedUnitPrice
                                                                                                                      ).toFixed(
                                                                                                                          2,
                                                                                                                      ),
                                                                                                                  ),
                                                                                                              meta: {
                                                                                                                  ...(item?.meta ||
                                                                                                                      {}),
                                                                                                                  categoryIds:
                                                                                                                      current?.categoryIds ||
                                                                                                                      item
                                                                                                                          ?.meta
                                                                                                                          ?.categoryIds ||
                                                                                                                      [],
                                                                                                                  shelfParentCategoryId:
                                                                                                                      current?.parentCategoryId ??
                                                                                                                      item
                                                                                                                          ?.meta
                                                                                                                          ?.shelfParentCategoryId ??
                                                                                                                      null,
                                                                                                                  basePrice:
                                                                                                                      resolvedBasePrice,
                                                                                                                  salesPrice:
                                                                                                                      resolvedSalesPrice,
                                                                                                                  customPrice:
                                                                                                                      resolvedCustomPrice,
                                                                                                                  unitPrice:
                                                                                                                      resolvedUnitPrice,
                                                                                                              },
                                                                                                          }
                                                                                                        : item,
                                                                                            ),
                                                                                        }),
                                                                                    );
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div className="md:col-span-2">
                                                                            <Menu
                                                                                noSize
                                                                                Icon={
                                                                                    null
                                                                                }
                                                                                label={
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        className="h-10 w-full justify-end text-xs font-semibold"
                                                                                    >
                                                                                        {money(
                                                                                            getShelfRowDisplayUnitPrice(
                                                                                                row,
                                                                                            ),
                                                                                        ) ||
                                                                                            "$0.00"}
                                                                                    </Button>
                                                                                }
                                                                            >
                                                                                <div className="min-w-[260px] space-y-3 p-2">
                                                                                    <div className="space-y-1">
                                                                                        <p className="text-xs font-bold uppercase text-muted-foreground">
                                                                                            Edit
                                                                                            Shelf
                                                                                            Price
                                                                                        </p>
                                                                                        <p className="text-xs text-muted-foreground">
                                                                                            Base
                                                                                            price
                                                                                            recalculates
                                                                                            sales
                                                                                            price.
                                                                                            Custom
                                                                                            price
                                                                                            overrides
                                                                                            the
                                                                                            final
                                                                                            line
                                                                                            price.
                                                                                        </p>
                                                                                    </div>
                                                                                    <div className="space-y-2">
                                                                                        <Label className="text-xs">
                                                                                            Base
                                                                                            Price
                                                                                        </Label>
                                                                                        <Input
                                                                                            type="number"
                                                                                            step="0.01"
                                                                                            value={getShelfRowBasePrice(
                                                                                                row,
                                                                                            )}
                                                                                            onChange={(
                                                                                                e,
                                                                                            ) =>
                                                                                                patchSection(
                                                                                                    (
                                                                                                        current,
                                                                                                    ) => ({
                                                                                                        ...current,
                                                                                                        rows: (
                                                                                                            current?.rows ||
                                                                                                            []
                                                                                                        ).map(
                                                                                                            (
                                                                                                                item,
                                                                                                                i: number,
                                                                                                            ) => {
                                                                                                                if (
                                                                                                                    i !==
                                                                                                                    rowIndex
                                                                                                                )
                                                                                                                    return item;
                                                                                                                const nextBase =
                                                                                                                    Number(
                                                                                                                        e
                                                                                                                            .target
                                                                                                                            .value ||
                                                                                                                            0,
                                                                                                                    );
                                                                                                                return {
                                                                                                                    ...item,
                                                                                                                    basePrice:
                                                                                                                        nextBase,
                                                                                                                    salesPrice:
                                                                                                                        profileAdjustedDoorSalesPrice(
                                                                                                                            null,
                                                                                                                            nextBase,
                                                                                                                            activeProfileCoefficient,
                                                                                                                        ),
                                                                                                                    unitPrice:
                                                                                                                        item?.customPrice !=
                                                                                                                            null ||
                                                                                                                        item
                                                                                                                            ?.meta
                                                                                                                            ?.customPrice !=
                                                                                                                            null
                                                                                                                            ? Number(
                                                                                                                                  item?.customPrice ??
                                                                                                                                      item
                                                                                                                                          ?.meta
                                                                                                                                          ?.customPrice ??
                                                                                                                                      0,
                                                                                                                              )
                                                                                                                            : profileAdjustedDoorSalesPrice(
                                                                                                                                  null,
                                                                                                                                  nextBase,
                                                                                                                                  activeProfileCoefficient,
                                                                                                                              ),
                                                                                                                    meta: {
                                                                                                                        ...(item?.meta ||
                                                                                                                            {}),
                                                                                                                        basePrice:
                                                                                                                            nextBase,
                                                                                                                        salesPrice:
                                                                                                                            profileAdjustedDoorSalesPrice(
                                                                                                                                null,
                                                                                                                                nextBase,
                                                                                                                                activeProfileCoefficient,
                                                                                                                            ),
                                                                                                                    },
                                                                                                                };
                                                                                                            },
                                                                                                        ),
                                                                                                    }),
                                                                                                )
                                                                                            }
                                                                                        />
                                                                                    </div>
                                                                                    <div className="flex justify-between text-xs">
                                                                                        <span className="text-muted-foreground">
                                                                                            Calculated
                                                                                            Sales
                                                                                        </span>
                                                                                        <span className="font-semibold">
                                                                                            {money(
                                                                                                getShelfRowSalesPrice(
                                                                                                    row,
                                                                                                ),
                                                                                            )}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="space-y-2">
                                                                                        <Label className="text-xs">
                                                                                            Custom
                                                                                            Price
                                                                                        </Label>
                                                                                        <Input
                                                                                            type="number"
                                                                                            step="0.01"
                                                                                            value={
                                                                                                row
                                                                                                    ?.meta
                                                                                                    ?.customPrice ??
                                                                                                ""
                                                                                            }
                                                                                            onChange={(
                                                                                                e,
                                                                                            ) =>
                                                                                                patchSection(
                                                                                                    (
                                                                                                        current,
                                                                                                    ) => ({
                                                                                                        ...current,
                                                                                                        rows: (
                                                                                                            current?.rows ||
                                                                                                            []
                                                                                                        ).map(
                                                                                                            (
                                                                                                                item,
                                                                                                                i: number,
                                                                                                            ) =>
                                                                                                                i ===
                                                                                                                rowIndex
                                                                                                                    ? {
                                                                                                                          ...item,
                                                                                                                          customPrice:
                                                                                                                              e
                                                                                                                                  .target
                                                                                                                                  .value ===
                                                                                                                              ""
                                                                                                                                  ? null
                                                                                                                                  : Number(
                                                                                                                                        e
                                                                                                                                            .target
                                                                                                                                            .value ||
                                                                                                                                            0,
                                                                                                                                    ),
                                                                                                                          unitPrice:
                                                                                                                              e
                                                                                                                                  .target
                                                                                                                                  .value ===
                                                                                                                              ""
                                                                                                                                  ? Number(
                                                                                                                                        item?.salesPrice ??
                                                                                                                                            item
                                                                                                                                                ?.meta
                                                                                                                                                ?.salesPrice ??
                                                                                                                                            item?.unitPrice ??
                                                                                                                                            0,
                                                                                                                                    )
                                                                                                                                  : Number(
                                                                                                                                        e
                                                                                                                                            .target
                                                                                                                                            .value ||
                                                                                                                                            0,
                                                                                                                                    ),
                                                                                                                          meta: {
                                                                                                                              ...(item?.meta ||
                                                                                                                                  {}),
                                                                                                                              customPrice:
                                                                                                                                  e
                                                                                                                                      .target
                                                                                                                                      .value ===
                                                                                                                                  ""
                                                                                                                                      ? null
                                                                                                                                      : Number(
                                                                                                                                            e
                                                                                                                                                .target
                                                                                                                                                .value ||
                                                                                                                                                0,
                                                                                                                                        ),
                                                                                                                          },
                                                                                                                      }
                                                                                                                    : item,
                                                                                                        ),
                                                                                                    }),
                                                                                                )
                                                                                            }
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </Menu>
                                                                        </div>
                                                                        <Input
                                                                            className="md:col-span-1 text-right"
                                                                            type="number"
                                                                            value={
                                                                                row.qty ||
                                                                                0
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                patchSection(
                                                                                    (
                                                                                        current,
                                                                                    ) => ({
                                                                                        ...current,
                                                                                        rows: (
                                                                                            current?.rows ||
                                                                                            []
                                                                                        ).map(
                                                                                            (
                                                                                                item,
                                                                                                i: number,
                                                                                            ) =>
                                                                                                i ===
                                                                                                rowIndex
                                                                                                    ? {
                                                                                                          ...item,
                                                                                                          qty: Number(
                                                                                                              e
                                                                                                                  .target
                                                                                                                  .value ||
                                                                                                                  0,
                                                                                                          ),
                                                                                                      }
                                                                                                    : item,
                                                                                        ),
                                                                                    }),
                                                                                )
                                                                            }
                                                                            placeholder="Qty"
                                                                        />
                                                                        <Input
                                                                            className="md:col-span-2 text-right"
                                                                            value={
                                                                                money(
                                                                                    getShelfRowDisplayTotal(
                                                                                        row,
                                                                                    ),
                                                                                ) ||
                                                                                "$0.00"
                                                                            }
                                                                            readOnly
                                                                        />
                                                                        <Button
                                                                            className="md:col-span-1"
                                                                            variant="destructive"
                                                                            onClick={() =>
                                                                                patchSection(
                                                                                    (
                                                                                        current,
                                                                                    ) => ({
                                                                                        ...current,
                                                                                        rows: (
                                                                                            current?.rows ||
                                                                                            []
                                                                                        ).filter(
                                                                                            (
                                                                                                _item,
                                                                                                i: number,
                                                                                            ) =>
                                                                                                i !==
                                                                                                rowIndex,
                                                                                        ),
                                                                                    }),
                                                                                )
                                                                            }
                                                                        >
                                                                            X
                                                                        </Button>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                    );
                                })()}
                            </div>
                        ) : !activeItemStep?.stepId &&
                          !activeItemStep?.step?.id ? (
                            <p className="text-sm text-muted-foreground">
                                Step is missing ID and cannot load components
                                yet.
                            </p>
                        ) : isDoorStepTitle(activeItemStep?.step?.title) &&
                          doorSectionTab === "suppliers" ? (
                            <DoorSupplierManager
                                suppliers={
                                    suppliersQuery.data?.stepProducts || []
                                }
                                selectedSupplierUid={
                                    getDoorSupplierMeta(activeItemStep)
                                        .supplierUid || null
                                }
                                supplierNameInput={supplierNameInput}
                                editingSupplier={editingSupplier}
                                isSaving={saveSupplierMutation.isPending}
                                isDeleting={deleteSupplierMutation.isPending}
                                onSupplierNameInputChange={setSupplierNameInput}
                                onSaveSupplier={async () => {
                                    const name = supplierNameInput.trim();
                                    if (!name) return;
                                    await saveSupplierMutation.mutateAsync({
                                        id: editingSupplier?.id || null,
                                        name,
                                    });
                                    await suppliersQuery.refetch();
                                    setSupplierNameInput("");
                                    setEditingSupplier(null);
                                }}
                                onCancelEdit={() => {
                                    setEditingSupplier(null);
                                    setSupplierNameInput("");
                                }}
                                onSelectDefault={() =>
                                    updateDoorSupplierAtStep(
                                        line,
                                        activeIndex,
                                        null,
                                    )
                                }
                                onSelectSupplier={(supplier) =>
                                    updateDoorSupplierAtStep(
                                        line,
                                        activeIndex,
                                        {
                                            uid: supplier.uid,
                                            name: supplier.name,
                                        },
                                    )
                                }
                                onEditSupplier={(supplier) => {
                                    setEditingSupplier({
                                        id: supplier.id,
                                        name: supplier.name,
                                    });
                                    setSupplierNameInput(supplier.name || "");
                                }}
                                onDeleteSupplier={async (supplier) => {
                                    if (
                                        getDoorSupplierMeta(activeItemStep)
                                            .supplierUid === supplier.uid
                                    ) {
                                        updateDoorSupplierAtStep(
                                            line,
                                            activeIndex,
                                            null,
                                        );
                                    }
                                    await deleteSupplierMutation.mutateAsync({
                                        id: supplier.id,
                                    });
                                    await suppliersQuery.refetch();
                                }}
                            />
                        ) : (
                            <WorkflowStepComponentPanel
                                lineUid={line.uid}
                                activeStep={activeItemStep}
                                activeStepIndex={activeIndex}
                                steps={steps}
                                loading={stepComponentsQuery.isPending}
                                components={visibleComponents}
                                filteredComponents={filteredVisibleComponents}
                                selectedUids={selectedUids}
                                search={componentSearch}
                                includeCustomComponents={
                                    includeCustomComponents
                                }
                                isDealershipMode={false}
                                mouldingSelection={{
                                    open: mouldingSelectionPopover.open,
                                    lineUid: mouldingSelectionPopover.lineUid,
                                    stepIndex:
                                        mouldingSelectionPopover.stepIndex,
                                    componentUid:
                                        mouldingSelectionPopover.component
                                            ?.uid || null,
                                    qty: mouldingSelectionPopover.qty,
                                    inputRef: mouldingQtyInputRef,
                                }}
                                isMouldingSelectionStep={
                                    isMouldingItem(line) &&
                                    normalizeTitle(
                                        activeItemStep?.step?.title,
                                    ) === "moulding"
                                }
                                redirectOptions={getRedirectableRoutes(
                                    routeData,
                                ).map((step) => ({
                                    uid: step.uid,
                                    title: step.title,
                                }))}
                                formatPrice={moneyIfPositive}
                                componentLabel={componentLabel}
                                resolveImageSrc={resolveComponentImageSrc}
                                calculatorSlot={(component) => (
                                    <MouldingCalculator
                                        title={String(component?.title || "")}
                                        unitPrice={Number(
                                            component?.salesPrice || 0,
                                        )}
                                        qty={Number(
                                            mouldingSelectionPopover.qty || 0,
                                        )}
                                        onCalculate={(qty) =>
                                            setMouldingSelectionQty(
                                                String(
                                                    Math.max(
                                                        1,
                                                        Number(qty || 0) || 1,
                                                    ),
                                                ),
                                            )
                                        }
                                    />
                                )}
                                onSearchChange={setComponentSearch}
                                onJumpStep={(stepIndex) =>
                                    setActiveStepByLine((prev) => ({
                                        ...prev,
                                        [line.uid]: stepIndex,
                                    }))
                                }
                                onSelectAll={() => {
                                    const patch = selectAllWorkflowComponents({
                                        line,
                                        stepIndex: activeIndex,
                                        components: visibleComponents,
                                    });
                                    if (patch) {
                                        updateLineItem(
                                            line.uid,
                                            patch as Partial<NewSalesFormLineItem>,
                                        );
                                    }
                                }}
                                onOpenPricing={(component) => {
                                    if (
                                        isDoorStepTitle(
                                            activeItemStep?.step?.title,
                                        )
                                    ) {
                                        setDoorStepModal({
                                            open: true,
                                            component,
                                        });
                                        return;
                                    }
                                    quickEditComponentPrice(
                                        line,
                                        activeIndex,
                                        component,
                                    );
                                }}
                                onOpenDoorSizeVariant={() =>
                                    setDoorSizeVariantModal({
                                        open: true,
                                        lineUid: line.uid,
                                        stepIndex: activeIndex,
                                    })
                                }
                                onEnableCustomComponent={() =>
                                    setIncludeCustomComponents(true)
                                }
                                onRefresh={() => {
                                    void stepComponentsQuery.refetch();
                                    void rootComponentsQuery.refetch();
                                }}
                                onToggleCustomComponents={() =>
                                    setIncludeCustomComponents((prev) => !prev)
                                }
                                onProceedMultiSelect={() =>
                                    proceedMultiSelectStep(line, activeIndex)
                                }
                                onEdit={(component) =>
                                    openComponentEditForm(
                                        line,
                                        activeIndex,
                                        component,
                                    )
                                }
                                onEditSectionOverride={(component) =>
                                    openComponentEditForm(
                                        line,
                                        activeIndex,
                                        component,
                                        "sectionOverride",
                                    )
                                }
                                onSelect={(component) =>
                                    saveSelectedComponent({
                                        line,
                                        steps,
                                        currentStepIndex: activeIndex,
                                        component,
                                    })
                                }
                                onClearRedirect={(component) =>
                                    setComponentRedirectUid(
                                        line,
                                        activeIndex,
                                        component.uid,
                                        null,
                                    )
                                }
                                onSetRedirect={(component, uid) =>
                                    setComponentRedirectUid(
                                        line,
                                        activeIndex,
                                        component.uid,
                                        uid,
                                    )
                                }
                                onDelete={(component) =>
                                    removeSelectedComponentFromStep(
                                        line,
                                        activeIndex,
                                        component.uid,
                                    )
                                }
                                onOpenDoorSizes={(component) =>
                                    setDoorStepModal({
                                        open: true,
                                        component,
                                    })
                                }
                                onOpenMouldingQty={(component) =>
                                    openMouldingSelectionQtyPopover(
                                        line,
                                        activeIndex,
                                        component,
                                    )
                                }
                                onCloseMouldingQty={
                                    closeMouldingSelectionPopover
                                }
                                onMouldingQtyChange={setMouldingSelectionQty}
                                onAddMoulding={(component) =>
                                    saveMouldingSelectionWithQty(
                                        line,
                                        steps,
                                        activeIndex,
                                        component,
                                        mouldingSelectionPopover.qty,
                                    )
                                }
                            />
                        )}
                    </DoorStepPanel>
                }
            />
        );
    }

    return (
        <>
            <WorkflowLineList
                items={visibleLineItems}
                activeLineUid={activeLine?.uid || null}
                activeStepByLine={activeStepByLine}
                resolveActiveStepIndex={resolveInteractiveStepIndex}
                getLineTitlePlaceholder={(line) =>
                    getLineTitlePlaceholder(line) || null
                }
                getLineDisplayTotal={(line) =>
                    getWorkflowLineDisplayTotal(line, activeProfileCoefficient)
                }
                onActivateLine={(line, isActive) =>
                    setEditor({
                        activeItem: isActive ? null : line.uid,
                    })
                }
                onTitleChange={(line, value) =>
                    updateLineItem(line.uid, {
                        title: value,
                    })
                }
                onRemoveLine={(line) => removeLineItem(line.uid)}
                onStepChange={(line, stepIndex) =>
                    setActiveStepByLine((prev) => ({
                        ...prev,
                        [line.uid]: stepIndex,
                    }))
                }
                renderPanel={(line, steps, activeIndex, activeItemStep) =>
                    renderItemComponentPanel(
                        line,
                        steps,
                        activeIndex,
                        activeItemStep,
                    )
                }
                isRedirectDisabledStep={isRedirectDisabledStep}
                stepKey={stepKey}
                componentLabel={componentLabel}
            />

            {activeLine ? (
                <DoorSizeVariantDialog
                    open={
                        doorSizeVariantModal.open &&
                        doorSizeVariantModal.lineUid === activeLine.uid
                    }
                    onOpenChange={(open) =>
                        setDoorSizeVariantModal((prev) => ({
                            ...prev,
                            open,
                            lineUid: open ? prev.lineUid : null,
                            stepIndex: open ? prev.stepIndex : -1,
                        }))
                    }
                    routeData={routeData}
                    steps={activeLineSteps}
                    initialVariations={
                        doorSizeVariantModal.stepIndex >= 0
                            ? activeLineSteps[doorSizeVariantModal.stepIndex]
                                  ?.meta?.doorSizeVariation ||
                              routeData?.stepsByUid?.[
                                  activeLineSteps[
                                      doorSizeVariantModal.stepIndex
                                  ]?.step?.uid || ""
                              ]?.meta?.doorSizeVariation ||
                              []
                            : []
                    }
                    onSave={(variations) => {
                        if (doorSizeVariantModal.stepIndex < 0) return;
                        saveDoorSizeVariants(
                            activeLine,
                            doorSizeVariantModal.stepIndex,
                            variations,
                        );
                    }}
                />
            ) : null}

            {activeLine ? (
                <DoorSizeQtyDialog
                    open={doorStepModal.open}
                    onOpenChange={(open) =>
                        setDoorStepModal((prev) => ({
                            ...prev,
                            open,
                            component: open ? prev.component : null,
                        }))
                    }
                    line={activeLine}
                    routeData={routeData}
                    component={doorStepModal.component}
                    supplierUid={activeDoorSupplier.supplierUid}
                    supplierName={activeDoorSupplier.supplierName}
                    suppliers={(suppliersQuery.data?.stepProducts || []).map(
                        (supplier) => ({
                            uid: String(supplier.uid || ""),
                            name: String(supplier.name || ""),
                        }),
                    )}
                    profileCoefficient={activeProfileCoefficient}
                    canEditPricing={
                        workflowAdminCapabilities.canEditLinePricing
                    }
                    onPriceSave={async ({
                        id,
                        stepId,
                        stepProductUid,
                        dependenciesUid,
                        price,
                    }) => {
                        const resolvedStepId =
                            stepId ||
                            activeDoorStep?.stepId ||
                            activeDoorStep?.step?.id;
                        if (!resolvedStepId || !stepProductUid) return;
                        await updateDoorPriceMutation.mutateAsync({
                            stepId: Number(resolvedStepId),
                            stepProductUid: String(stepProductUid),
                            pricings: [
                                {
                                    id: id || undefined,
                                    dependenciesUid,
                                    price,
                                },
                            ],
                        });
                        if (activeLine && activeDoorStepIndex >= 0) {
                            const steps = [...activeLineSteps];
                            const step = steps[activeDoorStepIndex];
                            const selectedComponents = Array.isArray(
                                step?.meta?.selectedComponents,
                            )
                                ? step.meta.selectedComponents
                                : [];
                            steps[activeDoorStepIndex] = {
                                ...step,
                                meta: {
                                    ...(step?.meta || {}),
                                    selectedComponents: selectedComponents.map(
                                        (component) => {
                                            if (
                                                String(component?.uid || "") !==
                                                String(stepProductUid || "")
                                            ) {
                                                return component;
                                            }
                                            const nextPricing = {
                                                ...(component?.pricing || {}),
                                                [dependenciesUid]: {
                                                    ...(component?.pricing?.[
                                                        dependenciesUid
                                                    ] || {}),
                                                    id:
                                                        id ||
                                                        component?.pricing?.[
                                                            dependenciesUid
                                                        ]?.id,
                                                    price,
                                                },
                                            };
                                            return {
                                                ...component,
                                                basePrice:
                                                    price == null
                                                        ? component?.basePrice
                                                        : price,
                                                salesPrice:
                                                    price == null
                                                        ? component?.salesPrice
                                                        : profileAdjustedDoorSalesPrice(
                                                              null,
                                                              price,
                                                              activeProfileCoefficient,
                                                          ),
                                                pricing: nextPricing,
                                            };
                                        },
                                    ),
                                },
                            };
                            updateLineItem(activeLine.uid, {
                                formSteps: steps,
                            } as Partial<NewSalesFormLineItem>);
                        }
                        await doorStepComponentsQuery.refetch();
                    }}
                    onSupplierChange={(supplierUid) => {
                        if (activeDoorStepIndex < 0) return;
                        const supplier =
                            supplierUid == null
                                ? null
                                : (
                                      suppliersQuery.data?.stepProducts || []
                                  ).find(
                                      (entry) =>
                                          String(entry.uid || "") ===
                                          String(supplierUid || ""),
                                  ) || null;
                        updateDoorSupplierAtStep(
                            activeLine,
                            activeDoorStepIndex,
                            supplier
                                ? {
                                      uid: supplier.uid,
                                      name: supplier.name,
                                  }
                                : null,
                        );
                    }}
                    routeConfig={resolveRouteConfigForLine({
                        routeData,
                        line: activeLine,
                        step: activeDoorStep || activeStep,
                        component: doorStepModal.component,
                    })}
                    onRemoveSelection={() => {
                        if (
                            !doorStepModal.component ||
                            !isDoorStepTitle(activeStep?.step?.title)
                        ) {
                            return;
                        }
                        saveSelectedComponent({
                            line: activeLine,
                            steps: activeLineSteps,
                            currentStepIndex: activeStepIndex,
                            component: doorStepModal.component,
                            selectedOverride: false,
                        });
                    }}
                    onNextStep={() => {
                        if (activeDoorStepIndex < 0) return;
                        setActiveStepByLine((prev) => ({
                            ...prev,
                            [activeLine.uid]: Math.min(
                                activeDoorStepIndex + 1,
                                Math.max(0, activeLineSteps.length - 1),
                            ),
                        }));
                    }}
                    onApply={({ rows, selected }) => {
                        if (!doorStepModal.component) return;
                        const sharedDoorSurcharge =
                            computeSharedDoorSurcharge(activeLine);
                        const targetComponentId = Number(
                            doorStepModal.component.id || 0,
                        );
                        const next = buildWorkflowDoorSizeVariantPatch({
                            line: activeLine,
                            componentId: targetComponentId,
                            rows,
                            sharedDoorSurcharge,
                            profileCoefficient: activeProfileCoefficient,
                        });
                        updateLineItem(
                            activeLine.uid,
                            next.linePatch as Partial<NewSalesFormLineItem>,
                        );

                        if (isDoorStepTitle(activeStep?.step?.title)) {
                            const firstResolvedRow = next.rows.find(
                                (row) => Number(row.totalQty || 0) > 0,
                            );
                            const resolvedDoorComponent = firstResolvedRow
                                ? {
                                      ...doorStepModal.component,
                                      salesPrice: Number(
                                          firstResolvedRow.unitPrice || 0,
                                      ),
                                      basePrice: Number(
                                          firstResolvedRow?.meta
                                              ?.baseUnitPrice || 0,
                                      ),
                                  }
                                : doorStepModal.component;
                            saveSelectedComponent({
                                line: activeLine,
                                steps: activeLineSteps,
                                currentStepIndex: activeStepIndex,
                                component: resolvedDoorComponent,
                                selectedOverride: selected,
                            });
                        }
                    }}
                />
            ) : null}

            {activeLine
                ? (() => {
                      const doorStepIndex = getWorkflowSteps(
                          activeLine,
                      ).findIndex((step) => isDoorStepTitle(step?.step?.title));
                      const sourceUid = String(doorSwapModal.sourceUid || "");
                      const selectedDoors = getSelectedDoorComponentsForLine(
                          activeLine,
                          {
                              availableComponents: visibleDoorComponents,
                          },
                      );
                      const sourceComponent = selectedDoors.find(
                          (component) =>
                              String(component?.uid || "") === sourceUid,
                      );
                      const candidates = visibleDoorComponents.filter(
                          (component) =>
                              String(component?.uid || "") !== sourceUid,
                      );

                      return (
                          <DoorSwapDialog
                              open={
                                  doorSwapModal.open &&
                                  doorSwapModal.lineUid === activeLine.uid
                              }
                              onOpenChange={(open) =>
                                  setDoorSwapModal((prev) => ({
                                      ...prev,
                                      open,
                                      lineUid: open ? prev.lineUid : null,
                                      sourceUid: open ? prev.sourceUid : null,
                                  }))
                              }
                              sourceComponent={sourceComponent}
                              candidates={candidates}
                              resolveImageSrc={resolveComponentImageSrc}
                              componentLabel={componentLabel}
                              formatPrice={moneyIfPositive}
                              onSwap={(component) => {
                                  if (!sourceComponent || doorStepIndex < 0)
                                      return;
                                  swapDoorComponentAtStep(
                                      activeLine,
                                      doorStepIndex,
                                      sourceComponent,
                                      component,
                                  );
                                  setDoorSwapModal({
                                      open: false,
                                      lineUid: null,
                                      sourceUid: null,
                                  });
                              }}
                          />
                      );
                  })()
                : null}

            {activeLine ? (
                <MouldingCalculatorDialog
                    open={isMouldingDialogOpen}
                    onOpenChange={setIsMouldingDialogOpen}
                    line={activeLine}
                    onApply={(linePatch) =>
                        updateLineItem(activeLine.uid, linePatch)
                    }
                />
            ) : null}

            <ComponentEditDialog
                open={componentEditModal.open}
                onOpenChange={(open) =>
                    setComponentEditModal((prev) => ({
                        ...prev,
                        open,
                        mode: open ? prev.mode : "edit",
                    }))
                }
                mode={componentEditModal.mode}
                componentTitle={componentEditModal.componentTitle}
                salesPrice={componentEditModal.salesPrice}
                redirectUid={componentEditModal.redirectUid}
                overrideMode={componentEditModal.overrideMode}
                noHandle={componentEditModal.noHandle}
                hasSwing={componentEditModal.hasSwing}
                redirectOptions={getRedirectableRoutes(routeData).map(
                    (route) => ({
                        uid: route.uid,
                        title: route.title,
                    }),
                )}
                imageUploadSlot={
                    <FileUploader
                        src={componentEditModal.componentImg || null}
                        label="Component Image"
                        folder="dyke"
                        width={120}
                        height={120}
                        onUpload={(assetId) =>
                            setComponentEditModal((prev) => ({
                                ...prev,
                                componentImg: String(assetId || ""),
                            }))
                        }
                    />
                }
                onPatch={(patch) =>
                    setComponentEditModal((prev) => ({
                        ...prev,
                        ...patch,
                    }))
                }
                onSave={saveComponentEditForm}
            />
        </>
    );
}
