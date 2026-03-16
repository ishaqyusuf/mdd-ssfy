"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@gnd/ui/button";
import { Menu } from "@gnd/ui/custom/menu";
import { Input } from "@gnd/ui/input";
import { Checkbox } from "@gnd/ui/checkbox";
import { Skeleton } from "@gnd/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { Label } from "@gnd/ui/label";
import { env } from "@/env.mjs";
import { MouldingCalculator } from "@/components/moulding-calculator";
import { FileUploader } from "@/components/common/file-uploader";
import {
    DoorOpen,
    ExternalLink,
    Filter,
    Hammer,
    Layers3,
    LucideVariable,
    Package2,
    Ruler,
    Trash2,
    WalletCards,
} from "lucide-react";
import { useNewSalesFormStore } from "../store";
import {
    useCustomerProfilesQuery,
    useNewSalesFormShelfCategoriesQuery,
    useNewSalesFormShelfProductsQuery,
    useSalesDeleteSupplierMutation,
    useSalesSaveSupplierMutation,
    useSalesSuppliersQuery,
    useSalesUpdateStepMetaMutation,
    useNewSalesFormStepRoutingQuery,
    useSalesStepComponentsQuery,
} from "../api";
import {
    DoorPriceCell,
    DoorSizeQtyDialog,
    DoorSizeVariantDialog,
    MouldingCalculatorDialog,
    profileAdjustedDoorSalesPrice,
    updateDoorRowBasePrice,
} from "./workflow-modals";
import {
    applyMultiSelectStepMutation,
    applySingleSelectStepMutation,
    buildConfiguredRouteSteps,
    buildSelectedByStepUid,
    buildSelectedProdUidsByStepUid,
    compactStepValue,
    getSelectedProdUids,
    isComponentVisibleByRules,
    mergeConfiguredSeriesWithExisting,
    normalizeSalesFormTitle as normalizeTitle,
    rebuildStepsFromSelection,
    deriveMouldingRows,
    deriveServiceRows,
    getRouteConfigForLine as resolveRouteConfigForLine,
    getSelectedDoorComponentsForLine,
    getSelectedMouldingComponentsForLine,
    isMouldingItem,
    isServiceItem,
    isShelfItem,
    findLineStepByTitle,
    getRedirectableRoutes,
    resolveDoorTierPricing,
    resolveComponentPriceByDeps,
    sharedMouldingComponentPrice,
    summarizeDoors,
    summarizeMouldingPersistRows,
    summarizeShelfRows,
    summarizeServiceRows,
    deriveDoorSizeCandidates,
} from "@gnd/sales/sales-form";
const MULTI_SELECT_STEP_TITLES = new Set([
    "door",
    "moulding",
    "weatherstrip color",
]);

function stepKey(lineUid: string, stepIndex: number) {
    return `${lineUid}:${stepIndex}`;
}
function isMultiSelectStepTitle(title?: string | null) {
    return MULTI_SELECT_STEP_TITLES.has(normalizeTitle(title));
}
function isDoorStepTitle(title?: string | null) {
    return normalizeTitle(title) === "door";
}
function isHousePackageToolStepTitle(title?: string | null) {
    const normalized = normalizeTitle(title);
    return normalized === "house package tool" || normalized === "hpt";
}
function getDoorSupplierMeta(step: any) {
    const meta = step?.meta || {};
    const formStepMeta = meta?.formStepMeta || {};
    const supplierUid = formStepMeta?.supplierUid || meta?.supplierUid || null;
    const supplierName =
        formStepMeta?.supplierName || meta?.supplierName || null;
    return {
        supplierUid: supplierUid ? String(supplierUid) : null,
        supplierName: supplierName ? String(supplierName) : null,
    };
}
function computeSharedDoorSurcharge(line: any) {
    return Number(
        ((line?.formSteps || []) as any[])
            .filter((step: any) => {
                const title = normalizeTitle(step?.step?.title);
                return (
                    title &&
                    title !== "item type" &&
                    title !== "door" &&
                    title !== "house package tool" &&
                    title !== "hpt"
                );
            })
            .reduce(
                (sum: number, step: any) => sum + Number(step?.price || 0),
                0,
            )
            .toFixed(2),
    );
}
function applySharedDoorSurcharge(
    rows: any[],
    surcharge: number,
    profileCoefficient?: number | null,
) {
    return (rows || []).map((row: any) => {
        const baseUnitPrice =
            row?.meta?.baseUnitPrice == null
                ? Number(row?.unitPrice || 0) - surcharge
                : Number(row.meta.baseUnitPrice || 0);
        const calculatedSalesUnit =
            row?.meta?.baseUnitPrice == null
                ? Math.max(0, Number(row?.unitPrice || 0) - surcharge)
                : profileAdjustedDoorSalesPrice(
                      null,
                      Math.max(0, baseUnitPrice),
                      profileCoefficient,
                  );
        const effectiveUnitPrice = Number(
            (Math.max(0, calculatedSalesUnit) + surcharge).toFixed(2),
        );
        const totalQty = Number(row?.totalQty || 0);
        return {
            ...row,
            unitPrice: effectiveUnitPrice,
            lineTotal: Number((totalQty * effectiveUnitPrice).toFixed(2)),
            meta: {
                ...(row?.meta || {}),
                baseUnitPrice: Math.max(0, baseUnitPrice),
            },
        };
    });
}
function repricePersistedDoorRowsForSupplier(
    line: any,
    nextSteps: any[],
    supplierUid?: string | null,
    salesMultiplier?: number | null,
) {
    const existingDoors = Array.isArray(line?.housePackageTool?.doors)
        ? line.housePackageTool.doors
        : [];
    if (!existingDoors.length) return null;

    const selectedDoorComponents = getSelectedDoorComponentsForLine({
        ...line,
        formSteps: nextSteps,
    });
    if (!selectedDoorComponents.length) return null;

    const componentById = new Map<number, any>();
    selectedDoorComponents.forEach((component: any) => {
        const componentId = Number(component?.id || 0);
        if (componentId > 0) componentById.set(componentId, component);
    });

    const sharedDoorSurcharge = computeSharedDoorSurcharge({
        ...line,
        formSteps: nextSteps,
    });
    const repricedRows = existingDoors.map((row: any) => {
        const component = componentById.get(Number(row?.stepProductId || 0));
        const size = String(row?.dimension || "").trim();
        if (!component || !size) return row;

        const tierPricing = resolveDoorTierPricing({
            pricing: component?.pricing || {},
            size,
            supplierUid,
            salesMultiplier,
            fallbackSalesPrice: component?.salesPrice,
            fallbackBasePrice: component?.basePrice,
        });
        const hasResolvedPrice = Boolean(tierPricing.hasPrice);
        const baseUnitPrice = hasResolvedPrice
            ? Number((tierPricing.basePrice || 0).toFixed(2))
            : 0;
        const unitPrice = hasResolvedPrice
            ? Number(
                  (
                      Number(tierPricing.salesPrice || 0) + sharedDoorSurcharge
                  ).toFixed(2),
              )
            : 0;
        const totalQty = Number(row?.totalQty || 0);
        return {
            ...row,
            unitPrice,
            lineTotal: Number((totalQty * unitPrice).toFixed(2)),
            meta: {
                ...(row?.meta || {}),
                baseUnitPrice,
                priceMissing: !hasResolvedPrice,
            },
        };
    });

    const totalDoors = repricedRows.reduce(
        (sum: number, row: any) => sum + Number(row?.totalQty || 0),
        0,
    );
    const totalPrice = Number(
        repricedRows
            .reduce(
                (sum: number, row: any) => sum + Number(row?.lineTotal || 0),
                0,
            )
            .toFixed(2),
    );

    return {
        doors: repricedRows,
        totalDoors,
        totalPrice,
    };
}
function money(value?: number | null) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}
function moneyIfPositive(value?: number | null) {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}
function firstFiniteNumber(...values: Array<number | null | undefined>) {
    for (const value of values) {
        const candidate = Number(value);
        if (Number.isFinite(candidate)) return candidate;
    }
    return null;
}
function snapshotSelectedComponent(component: any) {
    return {
        id: component?.id ?? null,
        uid: component?.uid || "",
        title: component?.title || "",
        img: component?.img || null,
        salesPrice:
            component?.salesPrice == null
                ? null
                : Number(component.salesPrice || 0),
        basePrice:
            component?.basePrice == null
                ? null
                : Number(component.basePrice || 0),
        pricing: component?.pricing || null,
        redirectUid: component?.redirectUid || null,
        sectionOverride: component?.sectionOverride || null,
    };
}
function normalizeMouldingStoredRows(rows: any[]) {
    return (rows || []).map((row: any) => ({
        uid: String(row?.uid || ""),
        title: String(row?.title || ""),
        description: String(row?.description || ""),
        qty: Number(row?.qty || 0),
        addon: Number(row?.addon || 0),
        customPrice:
            row?.customPrice == null || row?.customPrice === ""
                ? null
                : Number(row.customPrice || 0),
        salesPrice: Number(row?.salesPrice || 0),
        basePrice: Number(row?.basePrice || 0),
    }));
}
function normalizeStoredDoorRows(rows: any[]) {
    return (rows || []).map((row: any) => ({
        id: row?.id ?? null,
        dimension: String(row?.dimension || ""),
        swing: String(row?.swing || ""),
        stepProductId: Number(row?.stepProductId || 0),
        lhQty: Number(row?.lhQty || 0),
        rhQty: Number(row?.rhQty || 0),
        totalQty: Number(row?.totalQty || 0),
        unitPrice: Number(Number(row?.unitPrice || 0).toFixed(2)),
        lineTotal: Number(Number(row?.lineTotal || 0).toFixed(2)),
        addon:
            row?.addon == null || row?.addon === ""
                ? null
                : Number(Number(row.addon || 0).toFixed(2)),
        customPrice:
            row?.customPrice == null || row?.customPrice === ""
                ? null
                : Number(Number(row.customPrice || 0).toFixed(2)),
        meta: {
            baseUnitPrice: Number(
                Number(row?.meta?.baseUnitPrice || 0).toFixed(2),
            ),
            priceMissing: Boolean(row?.meta?.priceMissing),
        },
    }));
}
function profileAdjustedSalesPrice(
    salesPrice: number | null | undefined,
    basePrice: number | null | undefined,
    coefficient?: number | null,
) {
    const base = Number(basePrice);
    const sales = Number(salesPrice);
    const coeff = Number(coefficient || 0);
    const multiplier =
        Number.isFinite(coeff) && coeff > 0
            ? Number((1 / coeff).toFixed(2))
            : 1;
    if (
        Number.isFinite(base) &&
        base > 0 &&
        Number.isFinite(multiplier) &&
        multiplier > 0
    ) {
        return Number((base * multiplier).toFixed(2));
    }
    if (Number.isFinite(sales) && sales > 0) return sales;
    if (Number.isFinite(base) && base > 0) return base;
    return 0;
}
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
function firstPendingStepIndex(steps: any[]) {
    const pending = steps.findIndex(
        (step) => !String(step?.prodUid || "").trim(),
    );
    return pending >= 0 ? pending : Math.max(0, steps.length - 1);
}
function isRedirectDisabledStep(step: any) {
    return Boolean(step?.meta?.redirectDisabled);
}
function resolveInteractiveStepIndex(steps: any[], preferredIndex: number) {
    if (!steps.length) return 0;
    const clampedIndex = Math.max(
        0,
        Math.min(preferredIndex, Math.max(0, steps.length - 1)),
    );
    if (!isRedirectDisabledStep(steps[clampedIndex])) return clampedIndex;
    for (let index = clampedIndex + 1; index < steps.length; index += 1) {
        if (!isRedirectDisabledStep(steps[index])) return index;
    }
    for (let index = clampedIndex - 1; index >= 0; index -= 1) {
        if (!isRedirectDisabledStep(steps[index])) return index;
    }
    return clampedIndex;
}
function ComponentCardSkeletonGrid({ count = 6 }: { count?: number }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={`component-skeleton-${index}`}
                    className="overflow-hidden rounded-xl border bg-card"
                >
                    <Skeleton className="h-32 w-full" />
                    <div className="space-y-2 p-3">
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function componentLabel(value?: string | null) {
    return String(value || "")
        .trim()
        .toUpperCase();
}

export function ItemWorkflowPanel() {
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
        component: any | null;
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
    const [componentEditModal, setComponentEditModal] = useState<{
        open: boolean;
        lineUid: string | null;
        stepIndex: number;
        componentUid: string;
        componentTitle: string;
        componentImg: string;
        salesPrice: string;
        redirectUid: string;
        overrideMode: boolean;
        noHandle: boolean;
        hasSwing: boolean;
    }>({
        open: false,
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

    const activeLine =
        record?.lineItems?.find((line) => line.uid === editor.activeItem) ||
        record?.lineItems?.[0] ||
        null;
    const activeLineSteps = activeLine?.formSteps || [];
    const activeStepIndex =
        activeLine == null
            ? 0
            : resolveInteractiveStepIndex(
                  activeLineSteps,
                  activeStepByLine[activeLine.uid] ??
                      Math.max(0, activeLineSteps.length - 1),
              );
    const activeStep = activeLineSteps[activeStepIndex] || null;
    const activeDoorStep = activeLine
        ? findLineStepByTitle(activeLine, "Door")
        : null;
    const activeDoorStepIndex = activeLineSteps.findIndex((step: any) =>
        isDoorStepTitle(step?.step?.title),
    );
    const activeMouldingSync = useMemo(() => {
        if (!activeLine || !isMouldingItem(activeLine)) return null;
        const selectedMouldings = getSelectedMouldingComponentsForLine(activeLine);
        if (!selectedMouldings.length) return null;
        const existingRows = Array.isArray((activeLine.meta as any)?.mouldingRows)
            ? ((activeLine.meta as any)?.mouldingRows as any[])
            : [];
        const sharedComponentPrice = sharedMouldingComponentPrice(
            activeLine.formSteps || [],
        );
        const derivedRows = deriveMouldingRows({
            selectedMouldings,
            existingRows,
            sharedComponentPrice,
        });
        const summary = summarizeMouldingPersistRows(
            derivedRows,
            sharedComponentPrice,
        );
        const normalizedExistingRows = normalizeMouldingStoredRows(existingRows);
        const rowsChanged =
            JSON.stringify(normalizedExistingRows) !==
            JSON.stringify(summary.storedRows);
        const qtyChanged = Number(activeLine.qty || 0) !== summary.qtyTotal;
        const totalChanged =
            Number(Number(activeLine.lineTotal || 0).toFixed(2)) !==
            summary.total;
        const unitPriceChanged =
            Number(Number(activeLine.unitPrice || 0).toFixed(2)) !==
            summary.unitPrice;
        if (!rowsChanged && !qtyChanged && !totalChanged && !unitPriceChanged) {
            return null;
        }
        return {
            lineUid: activeLine.uid,
            storedRows: summary.storedRows,
            qtyTotal: summary.qtyTotal,
            total: summary.total,
            unitPrice: summary.unitPrice,
        };
    }, [activeLine]);
    useEffect(() => {
        if (!activeMouldingSync) return;
        updateLineItem(activeMouldingSync.lineUid, {
            meta: {
                ...(activeLine?.meta || {}),
                mouldingRows: activeMouldingSync.storedRows,
            } as any,
            qty: activeMouldingSync.qtyTotal,
            lineTotal: activeMouldingSync.total,
            unitPrice: activeMouldingSync.unitPrice,
        } as any);
    }, [activeLine?.meta, activeMouldingSync, updateLineItem]);
    const activeStepComponentOverrides = useMemo(() => {
        const overrides = new Map<string, any>();
        const selected = Array.isArray(activeStep?.meta?.selectedComponents)
            ? activeStep.meta.selectedComponents
            : [];
        selected.forEach((component: any) => {
            const uid = String(component?.uid || "").trim();
            if (!uid) return;
            overrides.set(uid, component);
        });
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
                    (activeLine?.shelfItems || [])
                        .flatMap((row: any) => [
                            Number(row?.categoryId || 0),
                            Number(
                                (row?.meta as any)?.shelfParentCategoryId || 0,
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
        const bucket = new Map<number, any[]>();
        (shelfProductsQuery.data || []).forEach((product: any) => {
            const keys = [
                Number(product?.categoryId || 0),
                Number(product?.parentCategoryId || 0),
            ].filter((id) => id > 0);
            keys.forEach((key) => {
                const list = bucket.get(key) || [];
                list.push(product);
                bucket.set(key, list);
            });
        });
        return bucket;
    }, [shelfProductsQuery.data]);
    const shelfCategories = useMemo(
        () => shelfCategoriesQuery.data || [],
        [shelfCategoriesQuery.data],
    );
    const shelfParentCategories = useMemo(
        () =>
            shelfCategories.filter(
                (category: any) =>
                    String(category?.type || "").toLowerCase() === "parent",
            ),
        [shelfCategories],
    );
    const activeProfileCoefficient = useMemo(() => {
        const selectedProfileId = Number(record?.form?.customerProfileId || 0);
        if (!selectedProfileId) return 1;
        const profile = (customerProfilesQuery.data || []).find(
            (cp: any) => Number(cp?.id || 0) === selectedProfileId,
        );
        const coefficient = Number(profile?.coefficient || 0);
        return Number.isFinite(coefficient) && coefficient > 0 ? coefficient : 1;
    }, [customerProfilesQuery.data, record?.form?.customerProfileId]);
    const activeDoorSync = useMemo(() => {
        if (!activeLine) return null;
        const storedDoors = Array.isArray(activeLine.housePackageTool?.doors)
            ? activeLine.housePackageTool.doors
            : [];
        if (!storedDoors.length) return null;
        const routeConfig = resolveRouteConfigForLine({
            routeData,
            line: activeLine,
            step: findLineStepByTitle(activeLine, "House Package Tool"),
        });
        const normalizedRows = applySharedDoorSurcharge(
            storedDoors,
            computeSharedDoorSurcharge(activeLine),
            activeProfileCoefficient,
        );
        const summary = summarizeDoors(normalizedRows, {
            noHandle: !!routeConfig?.noHandle,
            hasSwing: !!routeConfig?.hasSwing,
        });
        const rowsChanged =
            JSON.stringify(normalizeStoredDoorRows(storedDoors)) !==
            JSON.stringify(normalizeStoredDoorRows(summary.rows));
        const qtyChanged =
            Number(activeLine.qty || 0) !== Number(summary.totalDoors || 0);
        const totalChanged =
            Number(Number(activeLine.lineTotal || 0).toFixed(2)) !==
            Number(Number(summary.totalPrice || 0).toFixed(2));
        if (!rowsChanged && !qtyChanged && !totalChanged) return null;
        return {
            lineUid: activeLine.uid,
            rows: summary.rows,
            totalDoors: summary.totalDoors,
            totalPrice: summary.totalPrice,
        };
    }, [activeLine, activeProfileCoefficient, routeData]);
    useEffect(() => {
        if (!activeDoorSync) return;
        updateLineItem(activeDoorSync.lineUid, {
            housePackageTool: {
                ...(activeLine?.housePackageTool || { id: null }),
                doors: activeDoorSync.rows,
                totalDoors: activeDoorSync.totalDoors,
                totalPrice: activeDoorSync.totalPrice,
            } as any,
            qty: activeDoorSync.totalDoors,
            lineTotal: activeDoorSync.totalPrice,
        } as any);
    }, [activeDoorSync, activeLine?.housePackageTool, updateLineItem]);

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
    const activeDoorStepComponentOverrides = useMemo(() => {
        const overrides = new Map<string, any>();
        const selected = Array.isArray(activeDoorStep?.meta?.selectedComponents)
            ? activeDoorStep.meta.selectedComponents
            : [];
        selected.forEach((component: any) => {
            const uid = String(component?.uid || "").trim();
            if (!uid) return;
            overrides.set(uid, component);
        });
        if (String(activeDoorStep?.prodUid || "").trim()) {
            const uid = String(activeDoorStep?.prodUid || "").trim();
            if (!overrides.has(uid)) {
                overrides.set(uid, {
                    uid,
                    title: activeDoorStep?.value || null,
                    salesPrice: activeDoorStep?.price ?? null,
                    basePrice: activeDoorStep?.basePrice ?? null,
                    redirectUid: activeDoorStep?.meta?.redirectUid || null,
                    sectionOverride:
                        activeDoorStep?.meta?.sectionOverride || null,
                });
            }
        }
        return overrides;
    }, [activeDoorStep]);

    const visibleComponents = useMemo(() => {
        const selectedByStepUid = buildSelectedByStepUid(activeLineSteps);
        const selectedProdUidsByStepUid =
            buildSelectedProdUidsByStepUid(activeLineSteps);
        return (stepComponentsQuery.data || [])
            .filter((component) => !component.isDeleted)
            .filter((component) => {
                if (includeCustomComponents) return true;
                return (
                    !(component as any)?._metaData?.custom &&
                    !(component as any)?.custom
                );
            })
            .filter((component) =>
                isComponentVisibleByRules(
                    component,
                    selectedByStepUid,
                    selectedProdUidsByStepUid,
                ),
            )
            .map((component) => {
                const override = activeStepComponentOverrides.get(
                    String((component as any)?.uid || ""),
                );
                const price = resolveComponentPriceByDeps(
                    {
                        ...component,
                        ...(override || {}),
                    },
                    selectedByStepUid,
                    {
                        priceStepDeps: Array.isArray(
                            (activeStep as any)?.meta?.priceStepDeps,
                        )
                            ? ((activeStep as any).meta
                                  .priceStepDeps as string[])
                            : null,
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
                    basePrice: Number(
                        resolvedBasePrice ?? 0,
                    ),
                };
            });
    }, [
        stepComponentsQuery.data,
        activeLineSteps,
        includeCustomComponents,
        activeProfileCoefficient,
        activeStepComponentOverrides,
    ]);
    const visibleDoorComponents = useMemo(() => {
        const selectedByStepUid = buildSelectedByStepUid(activeLineSteps);
        const selectedProdUidsByStepUid =
            buildSelectedProdUidsByStepUid(activeLineSteps);
        return (doorStepComponentsQuery.data || [])
            .filter((component) => !component.isDeleted)
            .filter((component) => {
                if (includeCustomComponents) return true;
                return (
                    !(component as any)?._metaData?.custom &&
                    !(component as any)?.custom
                );
            })
            .filter((component) =>
                isComponentVisibleByRules(
                    component,
                    selectedByStepUid,
                    selectedProdUidsByStepUid,
                ),
            )
            .map((component) => {
                const override = activeDoorStepComponentOverrides.get(
                    String((component as any)?.uid || ""),
                );
                const price = resolveComponentPriceByDeps(
                    {
                        ...component,
                        ...(override || {}),
                    },
                    selectedByStepUid,
                    {
                        priceStepDeps: Array.isArray(
                            (activeDoorStep as any)?.meta?.priceStepDeps,
                        )
                            ? ((activeDoorStep as any).meta
                                  .priceStepDeps as string[])
                            : null,
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
        doorStepComponentsQuery.data,
        activeLineSteps,
        includeCustomComponents,
        activeProfileCoefficient,
        activeDoorStepComponentOverrides,
        activeDoorStep,
    ]);
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
            .filter((component: any) => configured.has(component.uid))
            .filter((component: any) => {
                if (includeCustomComponents) return true;
                return !component?._metaData?.custom && !component?.custom;
            })
            .filter((component: any) =>
                isComponentVisibleByRules(
                    component,
                    selectedByStepUid,
                    selectedProdUidsByStepUid,
                ),
            )
            .map((component: any) => {
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
                        priceStepDeps: Array.isArray(
                            (activeStep as any)?.meta?.priceStepDeps,
                        )
                            ? ((activeStep as any).meta
                                  .priceStepDeps as string[])
                            : null,
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
                    basePrice: Number(
                        resolvedBasePrice ?? 0,
                    ),
                };
            });
    }, [
        routeData,
        rootComponentsQuery.data,
        activeLineSteps,
        includeCustomComponents,
        activeProfileCoefficient,
        activeStepComponentOverrides,
    ]);
    const activeDoorSupplier = getDoorSupplierMeta(
        activeDoorStep || activeStep,
    );
    if (!record) return null;

    function saveSelectedComponent({
        line,
        steps,
        currentStepIndex,
        component,
        selectedOverride,
    }: {
        line: (typeof record.lineItems)[number];
        steps: any[];
        currentStepIndex: number;
        component: any;
        selectedOverride?: boolean;
    }) {
        const nextSteps = [...steps];
        const current = nextSteps[currentStepIndex];
        if (!current) return;
        const isMultiSelectStep = isMultiSelectStepTitle(current?.step?.title);

        if (isMultiSelectStep) {
            const multiMutation = applyMultiSelectStepMutation({
                steps: nextSteps,
                currentStepIndex,
                component,
                visibleComponents,
                selectedOverride,
                activeStepTitle: activeStep?.step?.title || "",
            });

            if (!multiMutation.hasSelection) {
                updateLineItem(line.uid, {
                    formSteps: multiMutation.steps.slice(
                        0,
                        currentStepIndex + 1,
                    ),
                });
                setActiveStepByLine((prev) => ({
                    ...prev,
                    [line.uid]: currentStepIndex,
                }));
                return;
            }
            updateLineItem(line.uid, {
                formSteps: multiMutation.steps,
            });
            setActiveStepByLine((prev) => ({
                ...prev,
                [line.uid]: currentStepIndex,
            }));
            return;
        }

        const singleMutationSteps = applySingleSelectStepMutation({
            steps: nextSteps,
            currentStepIndex,
            component,
            activeStepTitle: activeStep?.step?.title || "",
        });

        const selectedStepTitle = normalizeTitle(
            singleMutationSteps[currentStepIndex]?.step?.title,
        );
        const isItemTypeStep =
            currentStepIndex === 0 || selectedStepTitle === "item type";
        if (isItemTypeStep) {
            const rootUid =
                singleMutationSteps[currentStepIndex]?.step?.uid ||
                routeData?.stepsById?.[
                    singleMutationSteps[currentStepIndex]?.stepId || -1
                ] ||
                routeData?.rootStepUid;
            const rootStep = rootUid ? routeData?.stepsByUid?.[rootUid] : null;
            if (rootStep) {
                const configuredSeries = buildConfiguredRouteSteps(
                    routeData,
                    rootStep,
                    component,
                );
                const mergedSeries = mergeConfiguredSeriesWithExisting(
                    singleMutationSteps,
                    configuredSeries,
                );
                updateLineItem(line.uid, {
                    formSteps: mergedSeries,
                });
                setActiveStepByLine((prev) => ({
                    ...prev,
                    [line.uid]: mergedSeries.length > 1 ? 1 : 0,
                }));
                return;
            }
        }

        const routed = rebuildStepsFromSelection({
            routeData,
            line,
            steps: singleMutationSteps,
            startIndex: currentStepIndex,
            selectedComponent: {
                uid: component.uid,
                title: component.title,
                redirectUid:
                    (singleMutationSteps[currentStepIndex]?.meta as any)
                        ?.redirectUid || component.redirectUid,
            },
        });

        updateLineItem(line.uid, {
            formSteps: routed.steps,
        });
        const autoNext = resolveInteractiveStepIndex(
            routed.steps,
            routed.steps[currentStepIndex + 1] != null
                ? currentStepIndex + 1
                : routed.activeIndex,
        );
        setActiveStepByLine((prev) => ({
            ...prev,
            [line.uid]: autoNext,
        }));
    }
    function proceedMultiSelectStep(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
    ) {
        const steps = line.formSteps || [];
        const step = steps[stepIndex];
        if (!step) return;
        const selectedUids = getSelectedProdUids(step);
        if (!selectedUids.length) return;
        const candidates = selectedUids
            .map(
                (uid) =>
                    visibleComponents.find(
                        (component: any) => component.uid === uid,
                    ) ||
                    step?.meta?.selectedComponents?.find(
                        (component: any) => component.uid === uid,
                    ),
            )
            .filter(Boolean);
        const primary = candidates[0];
        if (!primary) return;
        const routed = rebuildStepsFromSelection({
            routeData,
            line,
            steps,
            startIndex: stepIndex,
            selectedComponent: {
                uid: primary.uid,
                title: primary.title,
                redirectUid:
                    (step?.meta as any)?.redirectUid || primary.redirectUid,
            },
        });
        updateLineItem(line.uid, {
            formSteps: routed.steps,
        });
        const nextIndex = resolveInteractiveStepIndex(
            routed.steps,
            routed.steps[stepIndex + 1] != null
                ? stepIndex + 1
                : routed.activeIndex,
        );
        setActiveStepByLine((prev) => ({
            ...prev,
            [line.uid]: nextIndex,
        }));
    }

    function selectRootComponent(
        line: (typeof record.lineItems)[number],
        component: any,
    ) {
        const rootStep = routeData?.rootStepUid
            ? routeData?.stepsByUid?.[routeData.rootStepUid]
            : null;
        if (!rootStep) return;

        const routedSteps = buildConfiguredRouteSteps(
            routeData,
            rootStep,
            component,
        );

        updateLineItem(line.uid, {
            formSteps: routedSteps,
            title:
                normalizeTitle(line.title).startsWith("new line") ||
                !line.title?.trim()
                    ? component.title || line.title
                    : line.title,
        });

        setEditor({
            activeItem: line.uid,
        });
        setActiveStepByLine((prev) => ({
            ...prev,
            [line.uid]: firstPendingStepIndex(routedSteps),
        }));
    }
    function updateDoorSupplierAtStep(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        supplier?: { uid?: string | null; name?: string | null } | null,
    ) {
        const steps = [...(line.formSteps || [])];
        const step = steps[stepIndex];
        if (!step) return;
        const currentMeta = step.meta || {};
        const currentFormStepMeta = currentMeta.formStepMeta || {};
        steps[stepIndex] = {
            ...step,
            meta: {
                ...currentMeta,
                formStepMeta: {
                    ...currentFormStepMeta,
                    supplierUid: supplier?.uid || null,
                    supplierName: supplier?.name || null,
                },
            },
        };
        const repricedDoors = repricePersistedDoorRowsForSupplier(
            line,
            steps,
            supplier?.uid || null,
            Number.isFinite(activeProfileCoefficient) &&
                activeProfileCoefficient > 0
                ? Number((1 / activeProfileCoefficient).toFixed(2))
                : 1,
        );
        const linePatch: Record<string, unknown> = {
            formSteps: steps,
        };
        if (repricedDoors) {
            linePatch.housePackageTool = {
                ...(line.housePackageTool || { id: null }),
                doors: repricedDoors.doors,
                totalDoors: repricedDoors.totalDoors,
                totalPrice: repricedDoors.totalPrice,
            };
            linePatch.qty = repricedDoors.totalDoors || line.qty;
            linePatch.lineTotal = repricedDoors.totalPrice || line.lineTotal;
        }
        updateLineItem(line.uid, linePatch as any);
    }
    function setStepRedirectUid(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        redirectUid: string | null,
    ) {
        const steps = [...(line.formSteps || [])];
        const step = steps[stepIndex];
        if (!step) return;
        steps[stepIndex] = {
            ...step,
            meta: {
                ...(step.meta || {}),
                redirectUid: redirectUid || null,
            },
        };
        updateLineItem(line.uid, { formSteps: steps });
    }
    function setComponentRedirectUid(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        componentUid: string,
        redirectUid: string | null,
    ) {
        const steps = [...(line.formSteps || [])];
        const step = steps[stepIndex];
        if (!step) return;
        const selectedComponents = Array.isArray(step?.meta?.selectedComponents)
            ? step.meta.selectedComponents
            : [];
        const nextSelectedComponents = selectedComponents.map((component: any) =>
            String(component?.uid || "") === String(componentUid || "")
                ? {
                      ...component,
                      redirectUid: redirectUid || null,
                  }
                : component,
        );
        steps[stepIndex] = {
            ...step,
            meta: {
                ...(step.meta || {}),
                redirectUid:
                    String(step?.prodUid || "") === String(componentUid || "")
                        ? redirectUid || null
                        : step?.meta?.redirectUid || null,
                selectedComponents: nextSelectedComponents,
            },
        };
        const selectedForRouting =
            String(step?.prodUid || "") === String(componentUid || "")
                ? nextSelectedComponents.find(
                      (component: any) =>
                          String(component?.uid || "") ===
                          String(componentUid || ""),
                  ) || {
                      uid: componentUid,
                      title: step?.value || "",
                      redirectUid: redirectUid || null,
                  }
                : null;
        if (!selectedForRouting) {
            updateLineItem(line.uid, {
                formSteps: steps,
            });
            return;
        }
        const routed = rebuildStepsFromSelection({
            routeData,
            line,
            steps,
            startIndex: stepIndex,
            selectedComponent: {
                uid: selectedForRouting.uid,
                title: selectedForRouting.title,
                redirectUid: selectedForRouting.redirectUid || null,
            },
        });
        updateLineItem(line.uid, {
            formSteps: routed.steps,
        });
        setActiveStepByLine((prev) => ({
            ...prev,
            [line.uid]: resolveInteractiveStepIndex(
                routed.steps,
                routed.activeIndex,
            ),
        }));
    }
    async function saveDoorSizeVariants(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        variations: any[],
    ) {
        const steps = [...(line.formSteps || [])];
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
        sourceComponent: any,
        targetComponent: any,
    ) {
        const steps = [...(line.formSteps || [])];
        const step = steps[stepIndex];
        if (!step || !sourceComponent || !targetComponent) return;
        const sourceUid = String(sourceComponent?.uid || "");
        const targetUid = String(targetComponent?.uid || "");
        if (!sourceUid || !targetUid || sourceUid === targetUid) return;

        const selectedComponents = Array.isArray(step?.meta?.selectedComponents)
            ? step.meta.selectedComponents
            : [];
        const nextSelectedComponents = selectedComponents.map((component: any) =>
            String(component?.uid || "") === sourceUid
                ? {
                      ...snapshotSelectedComponent(targetComponent),
                      redirectUid:
                          component?.redirectUid || targetComponent?.redirectUid || null,
                  }
                : component,
        );

        const nextStep = {
            ...step,
            componentId:
                String(step?.prodUid || "") === sourceUid
                    ? targetComponent?.id || step?.componentId || null
                    : step?.componentId,
            prodUid:
                String(step?.prodUid || "") === sourceUid
                    ? targetUid
                    : step?.prodUid,
            value:
                String(step?.prodUid || "") === sourceUid
                    ? targetComponent?.title || step?.value || ""
                    : step?.value,
            meta: {
                ...(step?.meta || {}),
                selectedComponents: nextSelectedComponents,
            },
        };
        steps[stepIndex] = nextStep;

        const sourceId = Number(sourceComponent?.id || 0);
        const targetId = Number(targetComponent?.id || 0);
        const remappedDoors = (line.housePackageTool?.doors || []).map((row: any) =>
            Number(row?.stepProductId || 0) === sourceId
                ? {
                      ...row,
                      stepProductId: targetId || row?.stepProductId || null,
                  }
                : row,
        );
        const lineWithRemappedDoors = {
            ...line,
            formSteps: steps,
            housePackageTool: {
                ...(line.housePackageTool || { id: null }),
                doors: remappedDoors,
            },
        };
        const repricedDoors = repricePersistedDoorRowsForSupplier(
            lineWithRemappedDoors,
            steps,
            getDoorSupplierMeta(nextStep).supplierUid,
            Number.isFinite(activeProfileCoefficient) &&
                activeProfileCoefficient > 0
                ? Number((1 / activeProfileCoefficient).toFixed(2))
                : 1,
        );

        updateLineItem(line.uid, {
            formSteps: steps,
            ...(repricedDoors
                ? ({
                      housePackageTool: {
                          ...(line.housePackageTool || { id: null }),
                          doors: repricedDoors.doors,
                          totalDoors: repricedDoors.totalDoors,
                          totalPrice: repricedDoors.totalPrice,
                      },
                      qty: repricedDoors.totalDoors,
                      lineTotal: repricedDoors.totalPrice,
                  } as any)
                : {}),
        } as any);
        setActiveHptDoorUidByLine((prev) => ({
            ...prev,
            [line.uid]: targetUid,
        }));
    }
    function openComponentEditForm(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        component: any,
    ) {
        const step = (line.formSteps || [])[stepIndex];
        if (!step) return;
        const selected = Array.isArray(step?.meta?.selectedComponents)
            ? step.meta.selectedComponents
            : [];
        const current = selected.find(
            (entry: any) =>
                String(entry?.uid || "") === String(component?.uid || ""),
        );
        const sectionOverride = current?.sectionOverride || component?.sectionOverride || {};
        setComponentEditModal({
            open: true,
            lineUid: line.uid,
            stepIndex,
            componentUid: String(component?.uid || ""),
            componentTitle: String(component?.title || component?.uid || "Component"),
            componentImg: String(current?.img || component?.img || ""),
            salesPrice: String(
                Number(current?.salesPrice ?? component?.salesPrice ?? 0) || 0,
            ),
            redirectUid: String(
                current?.redirectUid ??
                    component?.redirectUid ??
                    (String(step?.prodUid || "") === String(component?.uid || "")
                        ? step?.meta?.redirectUid
                        : "") ??
                    "",
            ),
            overrideMode: Boolean(sectionOverride?.overrideMode),
            noHandle: Boolean(sectionOverride?.noHandle),
            hasSwing:
                sectionOverride?.hasSwing == null
                    ? true
                    : Boolean(sectionOverride?.hasSwing),
        });
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
            setComponentEditModal((prev) => ({ ...prev, open: false }));
            return;
        }
        const steps = [...(line.formSteps || [])];
        const step = steps[componentEditModal.stepIndex];
        if (!step) {
            setComponentEditModal((prev) => ({ ...prev, open: false }));
            return;
        }
        const salesPrice = Number(componentEditModal.salesPrice || 0);
        const selected = Array.isArray(step?.meta?.selectedComponents)
            ? step.meta.selectedComponents
            : [];
        const hasTarget = selected.some(
            (entry: any) =>
                String(entry?.uid || "") === String(componentEditModal.componentUid),
        );
        const nextSelectedComponents = (hasTarget ? selected : [...selected, {}]).map(
            (entry: any, index: number) => {
                const isPlaceholder = !hasTarget && index === selected.length;
                const uid = isPlaceholder
                    ? String(componentEditModal.componentUid)
                    : String(entry?.uid || "");
                if (uid !== String(componentEditModal.componentUid)) return entry;
                return {
                    ...entry,
                    uid: String(componentEditModal.componentUid),
                    title:
                        entry?.title ||
                        componentEditModal.componentTitle ||
                        "Component",
                    img: componentEditModal.componentImg || null,
                    salesPrice,
                    basePrice:
                        entry?.basePrice == null
                            ? salesPrice
                            : Number(entry.basePrice),
                    redirectUid: componentEditModal.redirectUid || null,
                    sectionOverride: {
                        overrideMode: componentEditModal.overrideMode,
                        noHandle: componentEditModal.noHandle,
                        hasSwing: componentEditModal.hasSwing,
                    },
                };
            },
        );
        const isCurrentSelected =
            String(step?.prodUid || "") === String(componentEditModal.componentUid);
        steps[componentEditModal.stepIndex] = {
            ...step,
            price: isCurrentSelected ? salesPrice : step?.price,
            meta: {
                ...(step?.meta || {}),
                img: isCurrentSelected
                    ? componentEditModal.componentImg || null
                    : step?.meta?.img || null,
                redirectUid: isCurrentSelected
                    ? componentEditModal.redirectUid || null
                    : step?.meta?.redirectUid || null,
                sectionOverride: isCurrentSelected
                    ? {
                          overrideMode: componentEditModal.overrideMode,
                          noHandle: componentEditModal.noHandle,
                          hasSwing: componentEditModal.hasSwing,
                      }
                    : step?.meta?.sectionOverride || null,
                selectedComponents: nextSelectedComponents,
            },
        };
        updateLineItem(line.uid, {
            formSteps: steps,
        });
        setComponentEditModal((prev) => ({
            ...prev,
            open: false,
        }));
    }
    function removeSelectedComponentFromStep(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        componentUid: string,
    ) {
        const steps = [...(line.formSteps || [])];
        const step = steps[stepIndex];
        if (!step) return;
        if (isMultiSelectStepTitle(step?.step?.title)) {
            const selectedUids = getSelectedProdUids(step).filter(
                (uid) => uid !== componentUid,
            );
            const selectedComponents = (
                Array.isArray(step?.meta?.selectedComponents)
                    ? step.meta.selectedComponents
                    : []
            ).filter(
                (component: any) => String(component?.uid) !== componentUid,
            );
            const totalSales = selectedComponents.reduce(
                (sum: number, component: any) =>
                    sum + Number(component?.salesPrice || 0),
                0,
            );
            const totalBase = selectedComponents.reduce(
                (sum: number, component: any) =>
                    sum + Number(component?.basePrice || 0),
                0,
            );
            steps[stepIndex] = {
                ...step,
                prodUid: selectedUids[0] || "",
                componentId: selectedComponents[0]?.id || null,
                value: compactStepValue(selectedComponents),
                price: totalSales,
                basePrice: totalBase,
                meta: {
                    ...(step.meta || {}),
                    selectedProdUids: selectedUids,
                    selectedComponents,
                },
            };
            updateLineItem(line.uid, {
                formSteps: steps.slice(0, stepIndex + 1),
            });
            setActiveStepByLine((prev) => ({
                ...prev,
                [line.uid]: stepIndex,
            }));
            return;
        }
        steps[stepIndex] = {
            ...step,
            componentId: null,
            prodUid: "",
            value: "",
            price: 0,
            basePrice: 0,
        };
        updateLineItem(line.uid, {
            formSteps: steps.slice(0, stepIndex + 1),
        });
        setActiveStepByLine((prev) => ({
            ...prev,
            [line.uid]: stepIndex,
        }));
    }
    function quickEditComponentPrice(
        line: (typeof record.lineItems)[number],
        stepIndex: number,
        component: any,
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
        const steps = [...(line.formSteps || [])];
        const step = steps[stepIndex];
        if (!step) return;
        const selectedComponents = Array.isArray(step?.meta?.selectedComponents)
            ? step.meta.selectedComponents
            : [];
        const nextSelectedComponents = selectedComponents.map((entry: any) =>
            String(entry?.uid) === String(component?.uid)
                ? {
                      ...entry,
                      salesPrice: parsed,
                      basePrice:
                          entry?.basePrice == null
                              ? parsed
                              : Number(entry.basePrice),
                  }
                : entry,
        );
        const isTargetStep =
            String(step?.prodUid || "") === String(component?.uid);
        steps[stepIndex] = {
            ...step,
            price: isTargetStep ? parsed : step?.price,
            basePrice: isTargetStep
                ? (firstFiniteNumber(step?.basePrice, parsed) ?? parsed)
                : step?.basePrice,
            meta: {
                ...(step.meta || {}),
                selectedComponents: nextSelectedComponents,
            },
        };
        updateLineItem(line.uid, {
            formSteps: steps,
        });
    }
    function renderHousePackageToolPanel(
        line: (typeof record.lineItems)[number],
        activeItemStep: any,
    ) {
        const rows = line.housePackageTool?.doors || [];
        const routeConfig = resolveRouteConfigForLine({
            routeData,
            line,
            step: activeItemStep,
        });
        const noHandle = !!routeConfig?.noHandle;
        const hasSwing = !!routeConfig?.hasSwing;
        const summary = summarizeDoors(rows, { noHandle, hasSwing });
        const sharedDoorSurcharge = computeSharedDoorSurcharge(line);
        const doorStep = findLineStepByTitle(line, "Door");
        const supplier = getDoorSupplierMeta(doorStep);
        const selectedDoorComponents = getSelectedDoorComponentsForLine(line);
        const doorStepIndex = (line.formSteps || []).findIndex((step: any) =>
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
        const focusedRows = activeDoorComponent
            ? summary.rows.filter(
                  (row) =>
                      Number(row?.stepProductId || 0) ===
                      Number(activeDoorComponent.id || 0),
              )
            : summary.rows;
        const availableSizes = (() => {
            if (!activeDoorComponent) return [] as string[];
            const sizes = deriveDoorSizeCandidates(
                line as any,
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
            return visibleDoorComponents
                .filter(
                    (component: any) =>
                        String(component?.uid || "") !==
                        String(activeDoorComponent?.uid || ""),
                );
        })();

        const componentLookupById = new Map<
            number,
            { title: string; img?: string | null }
        >();
        (line.formSteps || []).forEach((step: any) => {
            const componentId = Number(step?.componentId || 0);
            if (componentId > 0) {
                componentLookupById.set(componentId, {
                    title:
                        step?.value ||
                        step?.step?.title ||
                        `Component ${componentId}`,
                    img: step?.meta?.img || null,
                });
            }
            const selected = Array.isArray(step?.meta?.selectedComponents)
                ? step.meta.selectedComponents
                : [];
            selected.forEach((component: any) => {
                const selectedId = Number(component?.id || 0);
                if (selectedId > 0) {
                    componentLookupById.set(selectedId, {
                        title:
                            component?.title ||
                            step?.step?.title ||
                            `Component ${selectedId}`,
                        img: component?.img || null,
                    });
                }
            });
        });

        function applyRows(nextRows: any[]) {
            const normalizedRows = applySharedDoorSurcharge(
                nextRows,
                sharedDoorSurcharge,
                activeProfileCoefficient,
            );
            const next = summarizeDoors(normalizedRows, { noHandle, hasSwing });
            updateLineItem(line.uid, {
                housePackageTool: {
                    ...(line.housePackageTool || { id: null }),
                    doors: next.rows,
                    totalDoors: next.totalDoors,
                    totalPrice: next.totalPrice,
                } as any,
                qty: next.totalDoors || line.qty,
                lineTotal: next.totalPrice || line.lineTotal,
            } as any);
        }

        function patchRow(sourceRow: any, patch: Record<string, unknown>) {
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
                                  tierPricing.salesPrice +
                                  sharedDoorSurcharge
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
        function removeSizeRow(sourceRow: any) {
            const nextRows = summary.rows.filter((row) => row !== sourceRow);
            applyRows(nextRows);
        }

        return (
            <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white">
                <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_55%)] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            <Package2 size={13} />
                            House Package Tool
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            <Hammer size={13} />
                            {supplier.supplierName || "GND MILLWORK"}
                        </span>
                        {activeDoorComponent ? (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="ml-auto"
                                    onClick={() =>
                                        setDoorStepModal({
                                            open: true,
                                            component: activeDoorComponent,
                                        })
                                    }
                                >
                                    Configure Sizes
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        setDoorSwapModal({
                                            open: true,
                                            lineUid: line.uid,
                                            sourceUid:
                                                activeDoorComponent?.uid || null,
                                        })
                                    }
                                    disabled={!swapDoorCandidates.length}
                                >
                                    Swap Door
                                </Button>
                            </>
                        ) : null}
                        {doorStepIndex >= 0 ? (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                    setActiveStepByLine((prev) => ({
                                        ...prev,
                                        [line.uid]: doorStepIndex,
                                    }))
                                }
                            >
                                Add Door Option
                            </Button>
                        ) : null}
                    </div>
                    {selectedDoorComponents.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {selectedDoorComponents.map((component) => {
                                const selected =
                                    component.uid === activeDoorUid;
                                return (
                                    <button
                                        key={`hpt-door-tab-${component.uid}`}
                                        type="button"
                                        className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                                            selected
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-slate-300 bg-white text-slate-600 hover:border-primary"
                                        }`}
                                        onClick={() =>
                                            setActiveHptDoorUidByLine(
                                                (prev) => ({
                                                    ...prev,
                                                    [line.uid]: component.uid,
                                                }),
                                            )
                                        }
                                    >
                                        {componentLabel(
                                            component.title || component.uid,
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                Rows
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                <Layers3 size={14} />
                                {summary.rows.length}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                Total Doors
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                <DoorOpen size={14} />
                                {summary.totalDoors}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                Package Total
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                                <WalletCards size={14} />
                                {money(summary.totalPrice) || "$0.00"}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="space-y-3 p-4">
                    {!selectedDoorComponents.length ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                            Select at least one DOOR component first, then
                            continue to HOUSE PACKAGE TOOL.
                        </div>
                    ) : !summary.rows.length ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                            Select a door component and apply size quantities to
                            build the package.
                        </div>
                    ) : (
                        (() => {
                            const componentId = Number(
                                activeDoorComponent?.id || 0,
                            );
                            const component =
                                componentLookupById.get(componentId) ||
                                activeDoorComponent;
                            const rowsForComponent = focusedRows;
                            const pricedSteps = (line.formSteps || []).filter(
                                (step: any) => {
                                    const title = normalizeTitle(
                                        step?.step?.title,
                                    );
                                    return (
                                        Number(step?.price || 0) > 0 &&
                                        title !== "item type" &&
                                        title !== "door" &&
                                        title !== "house package tool" &&
                                        title !== "hpt"
                                    );
                                },
                            );
                            if (!rowsForComponent.length) {
                                return (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                                        No size rows for{" "}
                                        {componentLabel(
                                            component?.title || "selected door",
                                        )}{" "}
                                        yet. Click{" "}
                                        <span className="font-semibold">
                                            Configure Sizes
                                        </span>{" "}
                                        to add them.
                                    </div>
                                );
                            }
                            return (
                                <article
                                    key={`hpt-group-${componentId}`}
                                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                                >
                                    <header className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                                            {resolveComponentImageSrc(
                                                component?.img,
                                            ) ? (
                                                <img
                                                    src={
                                                        resolveComponentImageSrc(
                                                            component?.img,
                                                        ) || ""
                                                    }
                                                    alt={
                                                        component?.title ||
                                                        `Component ${componentId}`
                                                    }
                                                    className="h-full w-full object-contain p-1"
                                                />
                                            ) : (
                                                <Ruler
                                                    size={15}
                                                    className="text-slate-500"
                                                />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                {componentLabel(
                                                    component?.title ||
                                                        `Component ${componentId}`,
                                                )}
                                            </p>
                                            <p className="text-[11px] uppercase tracking-wide text-slate-500">
                                                {rowsForComponent.length} size
                                                row
                                                {rowsForComponent.length > 1
                                                    ? "s"
                                                    : ""}
                                            </p>
                                        </div>
                                        <div className="ml-auto">
                                            <Menu
                                                Trigger={
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-2 text-[11px]"
                                                    >
                                                        Add Size
                                                    </Button>
                                                }
                                            >
                                                {!availableSizes.length ? (
                                                    <Menu.Item disabled>
                                                        No more sizes
                                                    </Menu.Item>
                                                ) : (
                                                    availableSizes.map(
                                                        (size) => (
                                                            <Menu.Item
                                                                key={`add-size-${componentId}-${size}`}
                                                                onClick={() =>
                                                                    addSizeRow(
                                                                        size,
                                                                    )
                                                                }
                                                            >
                                                                {size}
                                                            </Menu.Item>
                                                        ),
                                                    )
                                                )}
                                            </Menu>
                                        </div>
                                    </header>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    <th className="px-3 py-2">
                                                        Size
                                                    </th>
                                                    {hasSwing ? (
                                                        <th className="px-3 py-2">
                                                            Swing
                                                        </th>
                                                    ) : null}
                                                    {noHandle ? (
                                                        <th className="px-3 py-2 text-right">
                                                            Qty
                                                        </th>
                                                    ) : (
                                                        <>
                                                            <th className="px-3 py-2 text-right">
                                                                LH
                                                            </th>
                                                            <th className="px-3 py-2 text-right">
                                                                RH
                                                            </th>
                                                            <th className="px-3 py-2 text-right">
                                                                Total
                                                            </th>
                                                        </>
                                                    )}
                                                    <th className="px-3 py-2 text-right">
                                                        Unit
                                                    </th>
                                                    <th className="px-3 py-2 text-right">
                                                        Line
                                                    </th>
                                                    <th className="px-3 py-2 text-right">
                                                        Remove
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rowsForComponent.map(
                                                    (row, index) => (
                                                        <tr
                                                            key={`hpt-row-${componentId}-${index}`}
                                                            className="border-b border-slate-100 last:border-0"
                                                        >
                                                            <td className="px-3 py-2 font-medium text-slate-800">
                                                                {row.dimension ||
                                                                    "--"}
                                                            </td>
                                                            {hasSwing ? (
                                                                <td className="px-3 py-2">
                                                                    <Input
                                                                        value={
                                                                            row.swing ||
                                                                            ""
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            patchRow(
                                                                                row,
                                                                                {
                                                                                    swing: e
                                                                                        .target
                                                                                        .value,
                                                                                },
                                                                            )
                                                                        }
                                                                        className="h-8 rounded-md border-slate-200 text-xs"
                                                                        placeholder="LH/RH"
                                                                    />
                                                                </td>
                                                            ) : null}
                                                            {noHandle ? (
                                                                <td className="px-3 py-2">
                                                                    <Input
                                                                        type="number"
                                                                        value={
                                                                            Number(
                                                                                row.totalQty ||
                                                                                    0,
                                                                            ) > 0
                                                                                ? String(
                                                                                      Number(
                                                                                          row.totalQty ||
                                                                                              0,
                                                                                      ),
                                                                                  )
                                                                                : ""
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            patchRow(
                                                                                row,
                                                                                {
                                                                                    totalQty:
                                                                                        Number(
                                                                                            e
                                                                                                .target
                                                                                                .value ||
                                                                                                0,
                                                                                        ),
                                                                                    lhQty: 0,
                                                                                    rhQty: 0,
                                                                                },
                                                                            )
                                                                        }
                                                                        className="h-8 rounded-md border-slate-200 text-right text-xs"
                                                                    />
                                                                </td>
                                                            ) : (
                                                                <>
                                                                    <td className="px-3 py-2">
                                                                        <Input
                                                                            type="number"
                                                                            value={
                                                                                Number(
                                                                                    row.lhQty ||
                                                                                        0,
                                                                                ) > 0
                                                                                    ? String(
                                                                                          Number(
                                                                                              row.lhQty ||
                                                                                                  0,
                                                                                          ),
                                                                                      )
                                                                                    : ""
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                patchRow(
                                                                                    row,
                                                                                    {
                                                                                        lhQty: Number(
                                                                                            e
                                                                                                .target
                                                                                                .value ||
                                                                                                0,
                                                                                        ),
                                                                                    },
                                                                                )
                                                                            }
                                                                            className="h-8 rounded-md border-slate-200 text-right text-xs"
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <Input
                                                                            type="number"
                                                                            value={
                                                                                Number(
                                                                                    row.rhQty ||
                                                                                        0,
                                                                                ) > 0
                                                                                    ? String(
                                                                                          Number(
                                                                                              row.rhQty ||
                                                                                                  0,
                                                                                          ),
                                                                                      )
                                                                                    : ""
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                patchRow(
                                                                                    row,
                                                                                    {
                                                                                        rhQty: Number(
                                                                                            e
                                                                                                .target
                                                                                                .value ||
                                                                                                0,
                                                                                        ),
                                                                                    },
                                                                                )
                                                                            }
                                                                            className="h-8 rounded-md border-slate-200 text-right text-xs"
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
                                                                        {Number(
                                                                            row.totalQty ||
                                                                                0,
                                                                        )}
                                                                    </td>
                                                                </>
                                                            )}
                                                            <td className="px-3 py-2">
                                                                <DoorPriceCell
                                                                    row={row as any}
                                                                    profileCoefficient={
                                                                        activeProfileCoefficient
                                                                    }
                                                                    onSave={(
                                                                        nextBase,
                                                                    ) =>
                                                                        patchRow(
                                                                            row,
                                                                            updateDoorRowBasePrice(
                                                                                {
                                                                                    ...row,
                                                                                    unitPrice:
                                                                                        Number(
                                                                                            row?.unitPrice ||
                                                                                                0,
                                                                                        ),
                                                                                } as any,
                                                                                nextBase,
                                                                                activeProfileCoefficient,
                                                                            ),
                                                                        )
                                                                    }
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-xs font-semibold text-slate-900">
                                                                <Menu
                                                                    noSize
                                                                    Icon={null}
                                                                    label={
                                                                        <span className="cursor-pointer underline decoration-dotted underline-offset-2">
                                                                            {money(
                                                                                row.lineTotal,
                                                                            ) ||
                                                                                "$0.00"}
                                                                        </span>
                                                                    }
                                                                >
                                                                    <div className="min-w-[260px] space-y-2 p-2 text-left text-xs">
                                                                        <p className="font-bold uppercase text-muted-foreground">
                                                                            Estimate
                                                                            Breakdown
                                                                        </p>
                                                                        {pricedSteps.map(
                                                                            (
                                                                                step: any,
                                                                            ) => (
                                                                                <div
                                                                                    key={`priced-step-${row.dimension}-${step.stepId}-${step.value}`}
                                                                                    className="flex justify-between gap-3"
                                                                                >
                                                                                    <span>
                                                                                        {step?.step?.title ||
                                                                                            "Component"}
                                                                                    </span>
                                                                                    <span className="font-semibold">
                                                                                        {money(
                                                                                            step?.price,
                                                                                        ) ||
                                                                                            "$0.00"}
                                                                                    </span>
                                                                                </div>
                                                                            ),
                                                                        )}
                                                                        <div className="flex justify-between">
                                                                            <span>
                                                                                Door
                                                                            </span>
                                                                            <span className="font-semibold">
                                                                                {componentLabel(
                                                                                    activeDoorComponent?.title ||
                                                                                        "Selected Door",
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>
                                                                                Size
                                                                            </span>
                                                                            <span className="font-semibold">
                                                                                {row.dimension ||
                                                                                    "--"}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>
                                                                                Base
                                                                                Unit
                                                                            </span>
                                                                            <span className="font-semibold">
                                                                                {money(
                                                                                    firstFiniteNumber(
                                                                                        row
                                                                                            ?.meta
                                                                                            ?.baseUnitPrice,
                                                                                        Number(
                                                                                            row.unitPrice ??
                                                                                                0,
                                                                                        ) -
                                                                                            sharedDoorSurcharge,
                                                                                    ) ?? 0,
                                                                                ) ||
                                                                                    "$0.00"}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>
                                                                                Calculated
                                                                                Sales
                                                                            </span>
                                                                            <span className="font-semibold">
                                                                                {money(
                                                                                    profileAdjustedDoorSalesPrice(
                                                                                        null,
                                                                                        firstFiniteNumber(
                                                                                            row
                                                                                                ?.meta
                                                                                                ?.baseUnitPrice,
                                                                                            0,
                                                                                        ) ?? 0,
                                                                                        activeProfileCoefficient,
                                                                                    ),
                                                                                ) ||
                                                                                    "$0.00"}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>
                                                                                Component
                                                                                Surcharge
                                                                            </span>
                                                                            <span className="font-semibold">
                                                                                {money(
                                                                                    sharedDoorSurcharge,
                                                                                ) ||
                                                                                    "$0.00"}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>
                                                                                Final
                                                                                Unit
                                                                            </span>
                                                                            <span className="font-semibold">
                                                                                {money(
                                                                                    row.unitPrice,
                                                                                ) ||
                                                                                    "$0.00"}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span>
                                                                                Qty
                                                                            </span>
                                                                            <span className="font-semibold">
                                                                                {Number(
                                                                                    row.totalQty ||
                                                                                        0,
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <span>
                                                                                Addon
                                                                                Price
                                                                            </span>
                                                                            <Input
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={
                                                                                    row.addon ??
                                                                                    0
                                                                                }
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    patchRow(
                                                                                        row,
                                                                                        {
                                                                                            addon: Number(
                                                                                                e
                                                                                                    .target
                                                                                                    .value ||
                                                                                                    0,
                                                                                            ),
                                                                                        },
                                                                                    )
                                                                                }
                                                                                className="h-8 w-24 text-right text-xs"
                                                                            />
                                                                        </div>
                                                                        <div className="flex items-center justify-between gap-3">
                                                                            <span>
                                                                                Custom
                                                                                Price
                                                                            </span>
                                                                            <Input
                                                                                type="number"
                                                                                step="0.01"
                                                                                value={
                                                                                    row.customPrice ??
                                                                                    ""
                                                                                }
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    patchRow(
                                                                                        row,
                                                                                        {
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
                                                                                    )
                                                                                }
                                                                                className="h-8 w-24 text-right text-xs"
                                                                            />
                                                                        </div>
                                                                        <div className="border-t pt-2" />
                                                                        <div className="flex justify-between text-sm">
                                                                            <span className="font-semibold">
                                                                                Line
                                                                                Total
                                                                            </span>
                                                                            <span className="font-bold">
                                                                                {money(
                                                                                    row.lineTotal,
                                                                                ) ||
                                                                                    "$0.00"}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </Menu>
                                                            </td>
                                                            <td className="px-3 py-2 text-right">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="size-7 text-slate-500 hover:text-red-600"
                                                                    onClick={() =>
                                                                        removeSizeRow(
                                                                            row,
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </article>
                            );
                        })()
                    )}
                </div>
            </section>
        );
    }
    function renderMouldingLineItemPanel(
        line: (typeof record.lineItems)[number],
    ) {
        const selectedMouldings = getSelectedMouldingComponentsForLine(line);
        const existingRows = Array.isArray((line.meta as any)?.mouldingRows)
            ? ((line.meta as any)?.mouldingRows as any[])
            : [];
        const sharedComponentPrice = sharedMouldingComponentPrice(
            line.formSteps || [],
        );
        const rows = deriveMouldingRows({
            selectedMouldings,
            existingRows,
            sharedComponentPrice,
        });
        const aggregatedQty = rows.reduce(
            (sum, row: any) => sum + Number(row.qty || 0),
            0,
        );
        const aggregatedTotal = Number(
            rows
                .reduce((sum, row: any) => sum + Number(row.lineTotal || 0), 0)
                .toFixed(2),
        );
        function persistRows(nextRowsRaw: any[]) {
            const next = summarizeMouldingPersistRows(
                nextRowsRaw,
                sharedComponentPrice,
            );
            updateLineItem(line.uid, {
                meta: {
                    ...(line.meta || {}),
                    mouldingRows: next.storedRows,
                } as any,
                qty: next.qtyTotal,
                lineTotal: next.total,
                unitPrice: next.unitPrice,
            } as any);
        }
        function removeSelectedMoulding(mouldingUid: string) {
            const mouldingStepIndex = (line.formSteps || []).findIndex(
                (step: any) => normalizeTitle(step?.step?.title) === "moulding",
            );
            if (mouldingStepIndex < 0) {
                persistRows(
                    rows.filter((row: any) => String(row.uid) !== mouldingUid),
                );
                return;
            }
            const steps = [...(line.formSteps || [])];
            const mouldingStep = steps[mouldingStepIndex];
            const selectedUids = getSelectedProdUids(mouldingStep).filter(
                (uid) => uid !== mouldingUid,
            );
            const selectedComponentsSource = Array.isArray(
                mouldingStep?.meta?.selectedComponents,
            )
                ? mouldingStep.meta.selectedComponents
                : selectedMouldings;
            const remainingComponents = selectedUids
                .map(
                    (uid) =>
                        selectedMouldings.find(
                            (component: any) => String(component.uid) === uid,
                        ) ||
                        selectedComponentsSource.find(
                            (component: any) => String(component?.uid) === uid,
                        ),
                )
                .filter(Boolean);
            const primary = remainingComponents[0] || null;
            const totalSales = remainingComponents.reduce(
                (sum: number, component: any) =>
                    sum + Number(component?.salesPrice || 0),
                0,
            );
            const totalBase = remainingComponents.reduce(
                (sum: number, component: any) =>
                    sum + Number(component?.basePrice || 0),
                0,
            );
            steps[mouldingStepIndex] = {
                ...mouldingStep,
                componentId: primary?.id || null,
                prodUid: primary?.uid || "",
                value: compactStepValue(remainingComponents),
                price: remainingComponents.length ? totalSales : 0,
                basePrice: remainingComponents.length ? totalBase : 0,
                meta: {
                    ...(mouldingStep?.meta || {}),
                    selectedProdUids: selectedUids,
                    selectedComponents: remainingComponents.map((component: any) =>
                        snapshotSelectedComponent(component),
                    ),
                },
            };
            persistRows(
                rows.filter((row: any) => String(row.uid) !== mouldingUid),
            );
            updateLineItem(line.uid, {
                formSteps: steps,
            });
        }

        return (
            <div className="space-y-3 rounded-lg border p-3">
                {!rows.length ? (
                    <p className="text-sm text-muted-foreground">
                        No selected mouldings yet. Select mouldings in the
                        Moulding step.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-muted/30 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    <th className="px-3 py-2">Moulding</th>
                                    <th className="px-3 py-2 text-right">
                                        Qty
                                    </th>
                                    <th className="px-3 py-2 text-right">
                                        Estimate
                                    </th>
                                    <th className="px-3 py-2 text-right">
                                        Addon/Qty
                                    </th>
                                    <th className="px-3 py-2 text-right">
                                        Custom
                                    </th>
                                    <th className="px-3 py-2 text-right">
                                        Line Total
                                    </th>
                                    <th className="px-3 py-2 text-right">
                                        Remove
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row: any, index: number) => (
                                    <tr
                                        key={`moulding-row-${row.uid}-${index}`}
                                        className="border-t"
                                    >
                                        <td className="px-3 py-2">
                                            <p className="text-xs font-semibold uppercase">
                                                {componentLabel(row.title)}
                                            </p>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center justify-end gap-2">
                                                <MouldingCalculator
                                                    title={String(
                                                        row.title || "",
                                                    )}
                                                    unitPrice={Number(
                                                        row.estimateUnit || 0,
                                                    )}
                                                    qty={Number(row.qty || 0)}
                                                    onCalculate={(qty) =>
                                                        persistRows(
                                                            rows.map(
                                                                (
                                                                    item: any,
                                                                    i: number,
                                                                ) =>
                                                                    i === index
                                                                        ? {
                                                                              ...item,
                                                                              qty: Number(
                                                                                  qty ||
                                                                                      0,
                                                                              ),
                                                                          }
                                                                        : item,
                                                            ),
                                                        )
                                                    }
                                                />
                                                <Input
                                                    type="number"
                                                    value={row.qty}
                                                    onChange={(e) =>
                                                        persistRows(
                                                            rows.map(
                                                                (
                                                                    item: any,
                                                                    i: number,
                                                                ) =>
                                                                    i === index
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
                                                        )
                                                    }
                                                    className="h-8 w-20 text-right"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                                            {money(row.estimateUnit) || "$0.00"}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={row.addon}
                                                onChange={(e) =>
                                                    persistRows(
                                                        rows.map(
                                                            (
                                                                item: any,
                                                                i: number,
                                                            ) =>
                                                                i === index
                                                                    ? {
                                                                          ...item,
                                                                          addon: Number(
                                                                              e
                                                                                  .target
                                                                                  .value ||
                                                                                  0,
                                                                          ),
                                                                      }
                                                                    : item,
                                                        ),
                                                    )
                                                }
                                                className="h-8 text-right"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={row.customPrice ?? ""}
                                                onChange={(e) =>
                                                    persistRows(
                                                        rows.map(
                                                            (
                                                                item: any,
                                                                i: number,
                                                            ) =>
                                                                i === index
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
                                                                      }
                                                                    : item,
                                                        ),
                                                    )
                                                }
                                                className="h-8 text-right"
                                                placeholder="auto"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs font-bold">
                                            {money(row.lineTotal) || "$0.00"}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="size-7"
                                                disabled={rows.length <= 1}
                                                onClick={() =>
                                                    removeSelectedMoulding(
                                                        String(row.uid),
                                                    )
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t bg-muted/20 text-xs font-bold">
                                    <td className="px-3 py-2 uppercase">
                                        Total
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {aggregatedQty}
                                    </td>
                                    <td />
                                    <td />
                                    <td />
                                    <td className="px-3 py-2 text-right">
                                        {money(aggregatedTotal) || "$0.00"}
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        );
    }
    function renderServiceLineItemPanel(
        line: (typeof record.lineItems)[number],
    ) {
        const existingRows = Array.isArray((line.meta as any)?.serviceRows)
            ? ((line.meta as any)?.serviceRows as any[])
            : [];
        const rows = deriveServiceRows({
            lineUid: line.uid,
            existingRows,
            lineDescription: line.description,
            lineQty: line.qty,
            lineUnitPrice: line.unitPrice,
            lineTaxxable: Boolean((line.meta as any)?.taxxable),
            lineProduceable: Boolean((line.meta as any)?.produceable),
        });

        function persistRows(nextRowsRaw: any[]) {
            const next = summarizeServiceRows(line.uid, nextRowsRaw);
            updateLineItem(line.uid, {
                meta: {
                    ...(line.meta || {}),
                    serviceRows: next.rows,
                    taxxable: next.taxxable,
                    produceable: next.produceable,
                } as any,
                qty: next.qtyTotal,
                unitPrice: next.unitPrice,
                lineTotal: next.lineTotal,
                description: next.description,
            } as any);
        }

        return (
            <div className="space-y-3 rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Service Line Items
                </p>
                <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-muted/30 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                <th className="w-12 px-3 py-2">Sn.</th>
                                <th className="px-3 py-2">Service</th>
                                <th className="w-24 px-3 py-2 text-right">
                                    Qty
                                </th>
                                <th className="w-28 px-3 py-2 text-right">
                                    Price
                                </th>
                                <th className="w-20 px-3 py-2 text-center">
                                    Tax
                                </th>
                                <th className="w-24 px-3 py-2 text-center">
                                    Prod
                                </th>
                                <th className="w-28 px-3 py-2 text-right">
                                    Total
                                </th>
                                <th className="w-24 px-3 py-2 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row: any, index: number) => (
                                <tr
                                    key={`service-row-${row.uid}-${index}`}
                                    className="border-t"
                                >
                                    <td className="px-3 py-2 text-xs font-semibold">
                                        {index + 1}.
                                    </td>
                                    <td className="px-3 py-2">
                                        <Input
                                            value={row.service}
                                            onChange={(e) =>
                                                persistRows(
                                                    rows.map(
                                                        (
                                                            item: any,
                                                            i: number,
                                                        ) =>
                                                            i === index
                                                                ? {
                                                                      ...item,
                                                                      service:
                                                                          e
                                                                              .target
                                                                              .value,
                                                                  }
                                                                : item,
                                                    ),
                                                )
                                            }
                                            placeholder="Service"
                                            className="h-8"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <Input
                                            type="number"
                                            value={row.qty}
                                            onChange={(e) =>
                                                persistRows(
                                                    rows.map(
                                                        (
                                                            item: any,
                                                            i: number,
                                                        ) =>
                                                            i === index
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
                                                )
                                            }
                                            className="h-8 text-right"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={row.unitPrice}
                                            onChange={(e) =>
                                                persistRows(
                                                    rows.map(
                                                        (
                                                            item: any,
                                                            i: number,
                                                        ) =>
                                                            i === index
                                                                ? {
                                                                      ...item,
                                                                      unitPrice:
                                                                          Number(
                                                                              e
                                                                                  .target
                                                                                  .value ||
                                                                                  0,
                                                                          ),
                                                                  }
                                                                : item,
                                                    ),
                                                )
                                            }
                                            className="h-8 text-right"
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <Checkbox
                                            checked={Boolean(row.taxxable)}
                                            onCheckedChange={(checked) =>
                                                persistRows(
                                                    rows.map(
                                                        (
                                                            item: any,
                                                            i: number,
                                                        ) =>
                                                            i === index
                                                                ? {
                                                                      ...item,
                                                                      taxxable:
                                                                          Boolean(
                                                                              checked,
                                                                          ),
                                                                  }
                                                                : item,
                                                    ),
                                                )
                                            }
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <Checkbox
                                            checked={Boolean(row.produceable)}
                                            onCheckedChange={(checked) =>
                                                persistRows(
                                                    rows.map(
                                                        (
                                                            item: any,
                                                            i: number,
                                                        ) =>
                                                            i === index
                                                                ? {
                                                                      ...item,
                                                                      produceable:
                                                                          Boolean(
                                                                              checked,
                                                                          ),
                                                                  }
                                                                : item,
                                                    ),
                                                )
                                            }
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs font-bold">
                                        {money(row.lineTotal) || "$0.00"}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <Menu
                                            Trigger={
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 px-2 text-xs"
                                                >
                                                    Actions
                                                </Button>
                                            }
                                        >
                                            <Menu.Item
                                                className="text-red-600"
                                                onClick={() =>
                                                    persistRows(
                                                        rows.filter(
                                                            (
                                                                _: any,
                                                                i: number,
                                                            ) => i !== index,
                                                        ),
                                                    )
                                                }
                                            >
                                                Remove
                                            </Menu.Item>
                                        </Menu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Button
                    variant="secondary"
                    className="w-full uppercase"
                    onClick={() =>
                        persistRows([
                            ...rows,
                            {
                                uid: `service-${rows.length + 1}-${Date.now().toString(36)}`,
                                service: "",
                                taxxable: false,
                                produceable: false,
                                qty: 1,
                                unitPrice: 0,
                            },
                        ])
                    }
                >
                    Add New Line
                </Button>
            </div>
        );
    }
    function renderItemComponentPanel(
        line: (typeof record.lineItems)[number],
        steps: any[],
        activeIndex: number,
        activeItemStep: any,
    ) {
        const isHptStep = isHousePackageToolStepTitle(
            activeItemStep?.step?.title,
        );
        const isRedirectDisabled = isRedirectDisabledStep(activeItemStep);
        const selectedUids = new Set(getSelectedProdUids(activeItemStep));
        if (!steps.length) {
            return (
                <div className="space-y-3">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Root Step Components
                    </p>
                    {stepRoutingQuery.isPending ||
                    rootComponentsQuery.isPending ? (
                        <ComponentCardSkeletonGrid />
                    ) : !activeRootComponents.length ? (
                        <p className="text-sm text-muted-foreground">
                            No root components found in sales settings route.
                        </p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                            {activeRootComponents.map((component: any) => (
                                <button
                                    key={component.uid}
                                    type="button"
                                    className="overflow-hidden rounded-xl border bg-card text-left transition hover:border-primary"
                                    onClick={() =>
                                        selectRootComponent(line, component)
                                    }
                                >
                                    <div className="h-32 bg-muted">
                                        {resolveComponentImageSrc(
                                            component.img,
                                        ) ? (
                                            <img
                                                src={
                                                    resolveComponentImageSrc(
                                                        component.img,
                                                    ) || ""
                                                }
                                                alt={
                                                    component.title ||
                                                    component.uid
                                                }
                                                className="h-full w-full object-contain p-2"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                                No image
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <p className="font-semibold">
                                            {componentLabel(
                                                component.title ||
                                                    component.uid,
                                            )}
                                        </p>
                                        {moneyIfPositive(component.salesPrice) ? (
                                            <p className="text-xs font-medium text-primary">
                                                {moneyIfPositive(component.salesPrice)}
                                            </p>
                                        ) : null}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (isHptStep) {
            return renderHousePackageToolPanel(line, activeItemStep);
        }

        if (isRedirectDisabled) {
            return (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    This step is skipped by redirect and stays here for context.
                    Continue from{" "}
                    <span className="font-semibold">
                        {activeItemStep?.meta?.redirectTargetUid
                            ? routeData?.stepsByUid?.[
                                  activeItemStep.meta.redirectTargetUid
                              ]?.title || "the redirected step"
                            : "the redirected step"}
                    </span>
                    .
                </div>
            );
        }

        return (
            <div className="space-y-3">
                <div className="mb-3 flex items-center gap-2">
                    {!isMouldingItem(line) &&
                    !isServiceItem(line) &&
                    !isShelfItem(line) ? (
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Select Component:{" "}
                            {activeItemStep?.step?.title || "Current Step"}
                        </p>
                    ) : null}
                    <div className="ml-auto flex items-center gap-2">
                        {isDoorStepTitle(activeItemStep?.step?.title) ? (
                            <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
                                <Button
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    variant={
                                        doorSectionTab === "doors"
                                            ? "default"
                                            : "ghost"
                                    }
                                    onClick={() => setDoorSectionTab("doors")}
                                >
                                    Doors
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    variant={
                                        doorSectionTab === "suppliers"
                                            ? "default"
                                            : "ghost"
                                    }
                                    onClick={() =>
                                        setDoorSectionTab("suppliers")
                                    }
                                >
                                    Suppliers
                                </Button>
                            </div>
                        ) : null}
                        {isDoorStepTitle(activeItemStep?.step?.title) ? (
                            <p className="text-xs text-muted-foreground">
                                Supplier:{" "}
                                <span className="font-semibold text-foreground">
                                    {getDoorSupplierMeta(activeItemStep)
                                        .supplierName || "GND MILLWORK"}
                                </span>
                            </p>
                        ) : null}
                    </div>
                </div>

                {isMouldingItem(line) &&
                normalizeTitle(activeItemStep?.step?.title).includes(
                    "line item",
                ) ? (
                    renderMouldingLineItemPanel(line)
                ) : isServiceItem(line) &&
                  normalizeTitle(activeItemStep?.step?.title).includes(
                      "line item",
                  ) ? (
                    renderServiceLineItemPanel(line)
                ) : isShelfItem(line) &&
                  normalizeTitle(activeItemStep?.step?.title).includes(
                      "shelf",
                  ) ? (
                    <div className="space-y-3 rounded-lg border p-3">
                        {(() => {
                            const currentRows = line.shelfItems || [];
                            const persistRows = (nextRowsRaw: any[]) => {
                                const next = summarizeShelfRows(nextRowsRaw);
                                updateLineItem(line.uid, {
                                    shelfItems: next.rows,
                                    qty: next.qtyTotal,
                                    unitPrice: next.unitPrice,
                                    lineTotal: next.lineTotal,
                                } as any);
                            };
                            return (
                                <>
                                    <div className="flex items-center">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Shelf Items
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="ml-auto"
                                            onClick={() =>
                                                persistRows([
                                                    ...currentRows,
                                                    {
                                                        id: null,
                                                        categoryId: null,
                                                        productId: null,
                                                        description: "",
                                                        qty: 1,
                                                        unitPrice: 0,
                                                        totalPrice: 0,
                                                        meta: {},
                                                    },
                                                ])
                                            }
                                        >
                                            Add Shelf Row
                                        </Button>
                                    </div>
                                    {currentRows.length ? (
                                        <div className="space-y-2">
                                            {currentRows.map((row, idx) => (
                                                <div
                                                    key={`shelf-row-${idx}`}
                                                    className="grid gap-2 md:grid-cols-12"
                                                >
                                                    {(() => {
                                                        const rowMeta =
                                                            (row?.meta ||
                                                                {}) as any;
                                                        const selectedParentId =
                                                            Number(
                                                                rowMeta?.shelfParentCategoryId ||
                                                                    0,
                                                            ) || null;
                                                        const childCategories =
                                                            shelfCategories.filter(
                                                                (
                                                                    category: any,
                                                                ) => {
                                                                    if (
                                                                        String(
                                                                            category?.type ||
                                                                                "",
                                                                        ).toLowerCase() !==
                                                                        "child"
                                                                    )
                                                                        return false;
                                                                    return (
                                                                        Number(
                                                                            category?.parentCategoryId ||
                                                                                0,
                                                                        ) ===
                                                                            Number(
                                                                                selectedParentId ||
                                                                                    0,
                                                                            ) ||
                                                                        Number(
                                                                            category?.categoryId ||
                                                                                0,
                                                                        ) ===
                                                                            Number(
                                                                                selectedParentId ||
                                                                                    0,
                                                                            )
                                                                    );
                                                                },
                                                            );
                                                        const selectedCategoryId =
                                                            Number(
                                                                row.categoryId ||
                                                                    0,
                                                            ) || null;
                                                        const productOptions =
                                                            shelfProductsByCategory.get(
                                                                Number(
                                                                    selectedCategoryId ||
                                                                        selectedParentId ||
                                                                        0,
                                                                ),
                                                            ) || [];
                                                        return (
                                                            <>
                                                                <select
                                                                    className="h-10 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
                                                                    value={
                                                                        selectedParentId ??
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        const parentCategoryId =
                                                                            e
                                                                                .target
                                                                                .value
                                                                                ? Number(
                                                                                      e
                                                                                          .target
                                                                                          .value,
                                                                                  )
                                                                                : null;
                                                                        persistRows(
                                                                            currentRows.map(
                                                                                (
                                                                                    item,
                                                                                    i,
                                                                                ) =>
                                                                                    i ===
                                                                                    idx
                                                                                        ? {
                                                                                              ...item,
                                                                                              categoryId:
                                                                                                  null,
                                                                                              productId:
                                                                                                  null,
                                                                                              meta: {
                                                                                                  ...((item?.meta ||
                                                                                                      {}) as any),
                                                                                                  shelfParentCategoryId:
                                                                                                      parentCategoryId,
                                                                                              },
                                                                                          }
                                                                                        : item,
                                                                            ),
                                                                        );
                                                                    }}
                                                                >
                                                                    <option value="">
                                                                        Parent
                                                                    </option>
                                                                    {shelfParentCategories.map(
                                                                        (
                                                                            category: any,
                                                                        ) => (
                                                                            <option
                                                                                key={`shelf-parent-cat-${category.id}`}
                                                                                value={
                                                                                    category.id
                                                                                }
                                                                            >
                                                                                {
                                                                                    category.name
                                                                                }
                                                                            </option>
                                                                        ),
                                                                    )}
                                                                </select>
                                                                <select
                                                                    className="h-10 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
                                                                    value={
                                                                        selectedCategoryId ??
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        const categoryId =
                                                                            e
                                                                                .target
                                                                                .value
                                                                                ? Number(
                                                                                      e
                                                                                          .target
                                                                                          .value,
                                                                                  )
                                                                                : null;
                                                                        persistRows(
                                                                            currentRows.map(
                                                                                (
                                                                                    item,
                                                                                    i,
                                                                                ) =>
                                                                                    i ===
                                                                                    idx
                                                                                        ? {
                                                                                              ...item,
                                                                                              categoryId,
                                                                                              productId:
                                                                                                  null,
                                                                                          }
                                                                                        : item,
                                                                            ),
                                                                        );
                                                                    }}
                                                                    disabled={
                                                                        !selectedParentId
                                                                    }
                                                                >
                                                                    <option value="">
                                                                        Category
                                                                    </option>
                                                                    {childCategories.map(
                                                                        (
                                                                            category: any,
                                                                        ) => (
                                                                            <option
                                                                                key={`shelf-child-cat-${category.id}`}
                                                                                value={
                                                                                    category.id
                                                                                }
                                                                            >
                                                                                {
                                                                                    category.name
                                                                                }
                                                                            </option>
                                                                        ),
                                                                    )}
                                                                </select>
                                                                <select
                                                                    className="h-10 rounded-md border border-input bg-background px-3 text-sm md:col-span-2"
                                                                    value={
                                                                        row.productId ??
                                                                        ""
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        const productId =
                                                                            e
                                                                                .target
                                                                                .value
                                                                                ? Number(
                                                                                      e
                                                                                          .target
                                                                                          .value,
                                                                                  )
                                                                                : null;
                                                                        const selectedProduct =
                                                                            productOptions.find(
                                                                                (
                                                                                    product: any,
                                                                                ) =>
                                                                                    Number(
                                                                                        product?.id ||
                                                                                            0,
                                                                                    ) ===
                                                                                    Number(
                                                                                        productId ||
                                                                                            0,
                                                                                    ),
                                                                            );
                                                                        persistRows(
                                                                            currentRows.map(
                                                                                (
                                                                                    item,
                                                                                    i,
                                                                                ) =>
                                                                                    i ===
                                                                                    idx
                                                                                        ? {
                                                                                              ...item,
                                                                                              productId,
                                                                                              description:
                                                                                                  selectedProduct?.title ??
                                                                                                  item.description,
                                                                                              unitPrice:
                                                                                                  selectedProduct?.unitPrice ==
                                                                                                  null
                                                                                                      ? item.unitPrice
                                                                                                      : Number(
                                                                                                            selectedProduct.unitPrice,
                                                                                                        ),
                                                                                          }
                                                                                        : item,
                                                                            ),
                                                                        );
                                                                    }}
                                                                    disabled={
                                                                        !selectedParentId
                                                                    }
                                                                >
                                                                    <option value="">
                                                                        Product
                                                                    </option>
                                                                    {productOptions.map(
                                                                        (
                                                                            product: any,
                                                                        ) => (
                                                                            <option
                                                                                key={`shelf-prod-${product.id}`}
                                                                                value={
                                                                                    product.id
                                                                                }
                                                                            >
                                                                                {
                                                                                    product.title
                                                                                }
                                                                            </option>
                                                                        ),
                                                                    )}
                                                                </select>
                                                            </>
                                                        );
                                                    })()}
                                                    <Input
                                                        className="md:col-span-3"
                                                        value={
                                                            row.description ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            persistRows(
                                                                currentRows.map(
                                                                    (
                                                                        item,
                                                                        i,
                                                                    ) =>
                                                                        i ===
                                                                        idx
                                                                            ? {
                                                                                  ...item,
                                                                                  description:
                                                                                      e
                                                                                          .target
                                                                                          .value,
                                                                              }
                                                                            : item,
                                                                ),
                                                            )
                                                        }
                                                        placeholder="Description"
                                                    />
                                                    <Input
                                                        className="md:col-span-1"
                                                        type="number"
                                                        value={row.qty || 0}
                                                        onChange={(e) =>
                                                            persistRows(
                                                                currentRows.map(
                                                                    (
                                                                        item,
                                                                        i,
                                                                    ) =>
                                                                        i ===
                                                                        idx
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
                                                            )
                                                        }
                                                        placeholder="Qty"
                                                    />
                                                    <Input
                                                        className="md:col-span-2"
                                                        type="number"
                                                        step="0.01"
                                                        value={
                                                            row.unitPrice || 0
                                                        }
                                                        onChange={(e) =>
                                                            persistRows(
                                                                currentRows.map(
                                                                    (
                                                                        item,
                                                                        i,
                                                                    ) =>
                                                                        i ===
                                                                        idx
                                                                            ? {
                                                                                  ...item,
                                                                                  unitPrice:
                                                                                      Number(
                                                                                          e
                                                                                              .target
                                                                                              .value ||
                                                                                              0,
                                                                                      ),
                                                                              }
                                                                            : item,
                                                                ),
                                                            )
                                                        }
                                                        placeholder="Unit"
                                                    />
                                                    <Input
                                                        className="md:col-span-1"
                                                        value={
                                                            money(
                                                                row.totalPrice,
                                                            ) || "$0.00"
                                                        }
                                                        readOnly
                                                    />
                                                    <Button
                                                        className="md:col-span-1"
                                                        variant="destructive"
                                                        onClick={() =>
                                                            persistRows(
                                                                currentRows.filter(
                                                                    (_, i) =>
                                                                        i !==
                                                                        idx,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        X
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No shelf rows yet.
                                        </p>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                ) : !activeItemStep?.stepId && !activeItemStep?.step?.id ? (
                    <p className="text-sm text-muted-foreground">
                        Step is missing ID and cannot load components yet.
                    </p>
                ) : isDoorStepTitle(activeItemStep?.step?.title) &&
                  doorSectionTab === "suppliers" ? (
                    <div className="space-y-3 rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder={
                                    editingSupplier
                                        ? "Update supplier name"
                                        : "New supplier name"
                                }
                                value={supplierNameInput}
                                onChange={(e) =>
                                    setSupplierNameInput(e.target.value)
                                }
                            />
                            <Button
                                size="sm"
                                disabled={saveSupplierMutation.isPending}
                                onClick={async () => {
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
                            >
                                {editingSupplier ? "Update" : "Add"}
                            </Button>
                            {editingSupplier ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setEditingSupplier(null);
                                        setSupplierNameInput("");
                                    }}
                                >
                                    Cancel
                                </Button>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            className={`flex w-full items-center rounded-lg border px-3 py-2 text-left text-sm ${
                                !getDoorSupplierMeta(activeItemStep).supplierUid
                                    ? "border-primary bg-primary/5"
                                    : "hover:border-primary"
                            }`}
                            onClick={() =>
                                updateDoorSupplierAtStep(
                                    line,
                                    activeIndex,
                                    null,
                                )
                            }
                        >
                            GND MILLWORK (Default)
                        </button>
                        {(suppliersQuery.data?.stepProducts || []).map(
                            (supplier) => {
                                const selected =
                                    getDoorSupplierMeta(activeItemStep)
                                        .supplierUid === supplier.uid;
                                return (
                                    <div
                                        key={supplier.id}
                                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                                            selected
                                                ? "border-primary bg-primary/5"
                                                : "hover:border-primary"
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            className="flex-1 text-left text-sm uppercase"
                                            onClick={() =>
                                                updateDoorSupplierAtStep(
                                                    line,
                                                    activeIndex,
                                                    {
                                                        uid: supplier.uid,
                                                        name: supplier.name,
                                                    },
                                                )
                                            }
                                        >
                                            {supplier.name}
                                        </button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setEditingSupplier({
                                                    id: supplier.id,
                                                    name: supplier.name,
                                                });
                                                setSupplierNameInput(
                                                    supplier.name || "",
                                                );
                                            }}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            disabled={
                                                deleteSupplierMutation.isPending
                                            }
                                            onClick={async () => {
                                                if (
                                                    getDoorSupplierMeta(
                                                        activeItemStep,
                                                    ).supplierUid ===
                                                    supplier.uid
                                                ) {
                                                    updateDoorSupplierAtStep(
                                                        line,
                                                        activeIndex,
                                                        null,
                                                    );
                                                }
                                                await deleteSupplierMutation.mutateAsync(
                                                    {
                                                        id: supplier.id,
                                                    },
                                                );
                                                await suppliersQuery.refetch();
                                            }}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                );
                            },
                        )}
                    </div>
                ) : stepComponentsQuery.isPending ? (
                    <ComponentCardSkeletonGrid />
                ) : !visibleComponents.length ? (
                    <p className="text-sm text-muted-foreground">
                        No components returned for this step.
                    </p>
                ) : (
                    <>
                        <div className="sticky bottom-3 z-10 mb-3 flex items-center gap-2 rounded-lg border bg-background/95 p-2 backdrop-blur">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {visibleComponents.length} components
                            </span>
                            <div className="ml-auto">
                                <Menu
                                    Trigger={
                                        <Button size="sm" variant="outline">
                                            Controls
                                        </Button>
                                    }
                                >
                                    <Menu.Item
                                        SubMenu={(steps || []).map(
                                            (step, idx) => (
                                                <Menu.Item
                                                    key={`jump-step-${idx}`}
                                                    onClick={() =>
                                                        setActiveStepByLine(
                                                            (prev) => ({
                                                                ...prev,
                                                                [line.uid]: idx,
                                                            }),
                                                        )
                                                    }
                                                >
                                                    {step?.step?.title ||
                                                        `Step ${idx + 1}`}
                                                </Menu.Item>
                                            ),
                                        )}
                                    >
                                        Tabs
                                    </Menu.Item>
                                    <Menu.Item
                                        onClick={() => {
                                            if (
                                                !isMultiSelectStepTitle(
                                                    activeItemStep?.step?.title,
                                                )
                                            )
                                                return;
                                            const nextSteps = [
                                                ...(line.formSteps || []),
                                            ];
                                            const step = nextSteps[activeIndex];
                                            if (!step) return;
                                            const selectedComponents =
                                                visibleComponents.map(
                                                    (component: any) =>
                                                        snapshotSelectedComponent(
                                                            component,
                                                        ),
                                                );
                                            const selectedProdUids =
                                                selectedComponents
                                                    .map(
                                                        (component) =>
                                                            component.uid,
                                                    )
                                                    .filter(Boolean);
                                            const totalSales =
                                                selectedComponents.reduce(
                                                    (sum, component) =>
                                                        sum +
                                                        Number(
                                                            component.salesPrice ||
                                                                0,
                                                        ),
                                                    0,
                                                );
                                            const totalBase =
                                                selectedComponents.reduce(
                                                    (sum, component) =>
                                                        sum +
                                                        Number(
                                                            component.basePrice ||
                                                                0,
                                                        ),
                                                    0,
                                                );
                                            nextSteps[activeIndex] = {
                                                ...step,
                                                componentId:
                                                    selectedComponents[0]?.id ||
                                                    null,
                                                prodUid:
                                                    selectedComponents[0]
                                                        ?.uid || "",
                                                value: compactStepValue(
                                                    selectedComponents,
                                                ),
                                                price: totalSales,
                                                basePrice: totalBase,
                                                meta: {
                                                    ...(step?.meta || {}),
                                                    selectedProdUids,
                                                    selectedComponents,
                                                },
                                            };
                                            updateLineItem(line.uid, {
                                                formSteps: nextSteps,
                                            });
                                        }}
                                    >
                                        Select All
                                    </Menu.Item>
                                    <Menu.Item
                                        onClick={() => {
                                            const selectedComponent =
                                                visibleComponents.find(
                                                    (component: any) =>
                                                        selectedUids.has(
                                                            component.uid,
                                                        ),
                                                ) || visibleComponents[0];
                                            if (!selectedComponent) return;
                                            if (
                                                isDoorStepTitle(
                                                    activeItemStep?.step?.title,
                                                )
                                            ) {
                                                setDoorStepModal({
                                                    open: true,
                                                    component:
                                                        selectedComponent,
                                                });
                                                return;
                                            }
                                            quickEditComponentPrice(
                                                line,
                                                activeIndex,
                                                selectedComponent,
                                            );
                                        }}
                                    >
                                        Pricing
                                    </Menu.Item>
                                    {isDoorStepTitle(
                                        activeItemStep?.step?.title,
                                    ) ? (
                                        <Menu.Item
                                            onClick={() =>
                                                setDoorSizeVariantModal({
                                                    open: true,
                                                    lineUid: line.uid,
                                                    stepIndex: activeIndex,
                                                })
                                            }
                                        >
                                            Door Size Variant
                                        </Menu.Item>
                                    ) : null}
                                    <Menu.Item
                                        onClick={() => {
                                            setIncludeCustomComponents(true);
                                        }}
                                    >
                                        Component
                                    </Menu.Item>
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
                                </Menu>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                            {visibleComponents.map((component) => {
                                const isSelected = selectedUids.has(
                                    component.uid,
                                );
                                const redirectRoutes =
                                    getRedirectableRoutes(routeData);
                                return (
                                    <div
                                        key={component.uid}
                                        className={`relative overflow-hidden rounded-xl border text-left transition ${
                                            isSelected
                                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                : "bg-card hover:border-primary"
                                        }`}
                                    >
                                        <div className="absolute left-2 top-2 z-[2] flex flex-col gap-1">
                                            {component?.variations?.length ? (
                                                <span className="rounded bg-secondary p-1">
                                                    <Filter className="size-3 text-muted-foreground" />
                                                </span>
                                            ) : null}
                                            {component?.sectionOverride
                                                ?.overrideMode ? (
                                                <span className="rounded bg-secondary p-1">
                                                    <LucideVariable className="size-3 text-muted-foreground" />
                                                </span>
                                            ) : null}
                                            {component?.redirectUid ? (
                                                <span className="rounded bg-secondary p-1">
                                                    <ExternalLink className="size-3 text-muted-foreground" />
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="absolute right-2 top-2 z-[2]">
                                            <Menu
                                                Trigger={
                                                    <Button
                                                        size="icon"
                                                        variant="secondary"
                                                        className="size-7"
                                                    >
                                                        ...
                                                    </Button>
                                                }
                                            >
                                                <Menu.Item
                                                    onClick={() =>
                                                        openComponentEditForm(
                                                            line,
                                                            activeIndex,
                                                            component,
                                                        )
                                                    }
                                                >
                                                    Edit
                                                </Menu.Item>
                                                <Menu.Item
                                                    onClick={() =>
                                                        saveSelectedComponent({
                                                            line,
                                                            steps,
                                                            currentStepIndex:
                                                                activeIndex,
                                                            component,
                                                        })
                                                    }
                                                >
                                                    Select
                                                </Menu.Item>
                                                <Menu.Item
                                                    disabled={!redirectRoutes.length}
                                                    SubMenu={[
                                                        <Menu.Item
                                                            key={`redirect-none-${component.uid}`}
                                                            onClick={() =>
                                                                setComponentRedirectUid(
                                                                    line,
                                                                    activeIndex,
                                                                    component.uid,
                                                                    null,
                                                                )
                                                            }
                                                        >
                                                            Cancel Redirect
                                                        </Menu.Item>,
                                                        ...redirectRoutes.map((step: any) => (
                                                            <Menu.Item
                                                                key={`redirect-${component.uid}-${step.uid}`}
                                                                onClick={() =>
                                                                    setComponentRedirectUid(
                                                                        line,
                                                                        activeIndex,
                                                                        component.uid,
                                                                        step.uid,
                                                                    )
                                                                }
                                                            >
                                                                {step.title}
                                                            </Menu.Item>
                                                        )),
                                                    ]}
                                                >
                                                    Redirect
                                                </Menu.Item>
                                                <Menu.Item
                                                    className="text-red-600"
                                                    onClick={() =>
                                                        removeSelectedComponentFromStep(
                                                            line,
                                                            activeIndex,
                                                            component.uid,
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </Menu.Item>
                                            </Menu>
                                        </div>
                                        <button
                                            type="button"
                                            className="w-full text-left"
                                            onClick={() =>
                                                isDoorStepTitle(
                                                    activeItemStep?.step?.title,
                                                )
                                                    ? setDoorStepModal({
                                                          open: true,
                                                          component,
                                                      })
                                                    : saveSelectedComponent({
                                                          line,
                                                          steps,
                                                          currentStepIndex:
                                                              activeIndex,
                                                          component,
                                                      })
                                            }
                                        >
                                            <div className="h-32 bg-muted">
                                                {resolveComponentImageSrc(
                                                    component.img,
                                                ) ? (
                                                    <img
                                                        src={
                                                            resolveComponentImageSrc(
                                                                component.img,
                                                            ) || ""
                                                        }
                                                        alt={
                                                            component.title ||
                                                            component.uid
                                                        }
                                                        className="h-full w-full object-contain p-2"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                                        No image
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1 p-3">
                                                <p className="font-semibold leading-tight">
                                                    {componentLabel(
                                                        component.title,
                                                    )}
                                                </p>
                                                {moneyIfPositive(component.salesPrice) ? (
                                                    <p className="text-xs font-medium text-primary">
                                                        {moneyIfPositive(component.salesPrice)}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        {isMultiSelectStepTitle(activeItemStep?.step?.title) ? (
                            <div className="sticky bottom-3 mt-4 flex justify-end">
                                <Button
                                    onClick={() =>
                                        proceedMultiSelectStep(
                                            line,
                                            activeIndex,
                                        )
                                    }
                                    disabled={!selectedUids.size}
                                >
                                    Next Step
                                </Button>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        );
    }

    return (
        <>
            <section className="space-y-4">
                <div className="flex items-center">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Item Workflow
                    </h3>
                </div>

                <div className="space-y-3">
                    {record.lineItems.map((line, index) => {
                        const isActive = line.uid === activeLine?.uid;
                        const steps = line.formSteps || [];
                        const activeIndex =
                            resolveInteractiveStepIndex(
                                steps,
                                activeStepByLine[line.uid] ??
                                    Math.max(0, steps.length - 1),
                            );
                        const activeItemStep = steps[activeIndex];

                        return (
                            <div
                                key={line.uid}
                                className={`rounded-xl  bg-background p-4 transition-all ${
                                    isActive
                                        ? "border-primary ring-1 ring-primary/20"
                                        : "border-border/80 opacity-90 hover:opacity-100"
                                }`}
                            >
                                <div className="grid gap-3 md:grid-cols-12">
                                    <button
                                        type="button"
                                        className="text-left md:col-span-2"
                                        onClick={() =>
                                            setEditor({
                                                activeItem: line.uid,
                                            })
                                        }
                                    >
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Item {index + 1}
                                        </p>
                                    </button>
                                    <div className="md:col-span-8">
                                        <Input
                                            value={line.title || ""}
                                            onChange={(e) =>
                                                updateLineItem(line.uid, {
                                                    title: e.target.value,
                                                })
                                            }
                                            placeholder="Item Title / Location"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="w-full"
                                            onClick={() =>
                                                removeLineItem(line.uid)
                                            }
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </div>

                                {!!steps.length ? (
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        {steps.map((step, si) => (
                                            <button
                                                key={stepKey(line.uid, si)}
                                                type="button"
                                                className={`rounded-full border px-3 py-1 text-xs ${
                                                    activeIndex === si
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : isRedirectDisabledStep(
                                                                step,
                                                            )
                                                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                                          : "text-muted-foreground"
                                                }`}
                                                disabled={isRedirectDisabledStep(
                                                    step,
                                                )}
                                                onClick={() => {
                                                    if (
                                                        isRedirectDisabledStep(
                                                            step,
                                                        )
                                                    )
                                                        return;
                                                    setActiveStepByLine(
                                                        (prev) => ({
                                                            ...prev,
                                                            [line.uid]: si,
                                                        }),
                                                    );
                                                }}
                                            >
                                                {step.value
                                                    ? componentLabel(step.value)
                                                    : step.step?.title ||
                                                      `Step ${si + 1}`}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                                {isActive ? (
                                    <div className="mt-4">
                                        {renderItemComponentPanel(
                                            line,
                                            steps,
                                            activeIndex,
                                            activeItemStep,
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </section>

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
                            ? activeLineSteps[doorSizeVariantModal.stepIndex]?.meta
                                  ?.doorSizeVariation ||
                              routeData?.stepsByUid?.[
                                  activeLineSteps[doorSizeVariantModal.stepIndex]
                                      ?.step?.uid || ""
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
                    onSupplierChange={(supplierUid) => {
                        if (activeDoorStepIndex < 0) return;
                        const supplier =
                            supplierUid == null
                                ? null
                                : (suppliersQuery.data?.stepProducts || []).find(
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
                        const existingDoors =
                            activeLine.housePackageTool?.doors || [];
                        const sharedDoorSurcharge =
                            computeSharedDoorSurcharge(activeLine);
                        const targetComponentId = Number(
                            doorStepModal.component.id || 0,
                        );
                        const retainedDoors = existingDoors.filter(
                            (door) =>
                                Number(door.stepProductId || 0) !==
                                targetComponentId,
                        );
                        const nextRows = applySharedDoorSurcharge(
                            rows,
                            sharedDoorSurcharge,
                            activeProfileCoefficient,
                        );
                        const nextDoors = [
                            ...retainedDoors,
                            ...nextRows.map((row) => ({
                                ...row,
                                stepProductId:
                                    targetComponentId ||
                                    row.stepProductId ||
                                    null,
                            })),
                        ];
                        const totalDoors = nextDoors.reduce(
                            (sum, door) => sum + Number(door.totalQty || 0),
                            0,
                        );
                        const totalPrice = nextDoors.reduce(
                            (sum, door) => sum + Number(door.lineTotal || 0),
                            0,
                        );

                        updateLineItem(activeLine.uid, {
                            housePackageTool: {
                                ...(activeLine.housePackageTool || {
                                    id: null,
                                }),
                                doors: nextDoors,
                                totalDoors,
                                totalPrice,
                            } as any,
                            qty: totalDoors || activeLine.qty,
                            lineTotal: totalPrice || activeLine.lineTotal,
                        } as any);

                        if (isDoorStepTitle(activeStep?.step?.title)) {
                            const firstResolvedRow = nextRows.find(
                                (row) => Number(row.totalQty || 0) > 0,
                            );
                            const resolvedDoorComponent = firstResolvedRow
                                ? {
                                      ...doorStepModal.component,
                                      salesPrice: Number(
                                          firstResolvedRow.unitPrice || 0,
                                      ),
                                      basePrice: Number(
                                          (firstResolvedRow as any)?.meta
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

            {activeLine ? (() => {
                const doorStep = findLineStepByTitle(activeLine, "Door");
                const doorStepIndex = (activeLine.formSteps || []).findIndex(
                    (step: any) => isDoorStepTitle(step?.step?.title),
                );
                const sourceUid = String(doorSwapModal.sourceUid || "");
                const selectedDoors = getSelectedDoorComponentsForLine(activeLine);
                const sourceComponent = selectedDoors.find(
                    (component) => String(component?.uid || "") === sourceUid,
                );
                const candidates = visibleDoorComponents
                    .filter(
                        (component: any) =>
                            String(component?.uid || "") !== sourceUid,
                    );

                return (
                    <Dialog
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
                    >
                        <DialogContent className="max-w-[880px]">
                            <DialogHeader>
                                <DialogTitle>Swap Door</DialogTitle>
                                <DialogDescription>
                                    Replace the selected door while keeping the
                                    current size and quantity rows.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[70vh] overflow-y-auto pr-1">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {candidates.map((component: any) => (
                                    <button
                                        key={`swap-door-${component.uid}`}
                                        type="button"
                                        className="rounded-2xl border bg-white p-4 text-left transition hover:border-primary hover:bg-primary/5"
                                        onClick={() => {
                                            if (
                                                !sourceComponent ||
                                                doorStepIndex < 0
                                            ) {
                                                return;
                                            }
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
                                    >
                                        <div className="space-y-2">
                                            <p className="text-sm font-semibold text-foreground">
                                                {componentLabel(
                                                    component?.title ||
                                                        component?.uid ||
                                                        "Door",
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Existing rows for{" "}
                                                {componentLabel(
                                                    sourceComponent?.title ||
                                                        sourceComponent?.uid ||
                                                        "current door",
                                                )}{" "}
                                                will be repriced on this door.
                                            </p>
                                        </div>
                                    </button>
                                ))}
                                {!candidates.length ? (
                                    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                                        No other visible door options are
                                        available to swap into right now.
                                    </div>
                                ) : null}
                            </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        setDoorSwapModal({
                                            open: false,
                                            lineUid: null,
                                            sourceUid: null,
                                        })
                                    }
                                >
                                    Cancel
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                );
            })() : null}

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

            <Dialog
                open={componentEditModal.open}
                onOpenChange={(open) =>
                    setComponentEditModal((prev) => ({ ...prev, open }))
                }
            >
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Component Edit</DialogTitle>
                        <DialogDescription>
                            Standard component edit form for this line step.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-1">
                        <div className="grid gap-2">
                            <Label>Component</Label>
                            <Input value={componentEditModal.componentTitle} readOnly />
                        </div>
                        <div className="grid gap-2">
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
                        </div>
                        <div className="grid gap-2">
                            <Label>Sales Cost</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={componentEditModal.salesPrice}
                                onChange={(e) =>
                                    setComponentEditModal((prev) => ({
                                        ...prev,
                                        salesPrice: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Redirect</Label>
                            <select
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={componentEditModal.redirectUid || ""}
                                onChange={(e) =>
                                    setComponentEditModal((prev) => ({
                                        ...prev,
                                        redirectUid: e.target.value,
                                    }))
                                }
                            >
                                <option value="">None</option>
                                {getRedirectableRoutes(routeData).map((route) => (
                                    <option key={`edit-redirect-${route.uid}`} value={route.uid}>
                                        {route.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="rounded-md border p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <Label>Section Setting Override</Label>
                                <Checkbox
                                    checked={componentEditModal.overrideMode}
                                    onCheckedChange={(checked) =>
                                        setComponentEditModal((prev) => ({
                                            ...prev,
                                            overrideMode: Boolean(checked),
                                        }))
                                    }
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                    <span>No Handle</span>
                                    <Checkbox
                                        checked={componentEditModal.noHandle}
                                        disabled={!componentEditModal.overrideMode}
                                        onCheckedChange={(checked) =>
                                            setComponentEditModal((prev) => ({
                                                ...prev,
                                                noHandle: Boolean(checked),
                                            }))
                                        }
                                    />
                                </label>
                                <label className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                    <span>Has Swing</span>
                                    <Checkbox
                                        checked={componentEditModal.hasSwing}
                                        disabled={!componentEditModal.overrideMode}
                                        onCheckedChange={(checked) =>
                                            setComponentEditModal((prev) => ({
                                                ...prev,
                                                hasSwing: Boolean(checked),
                                            }))
                                        }
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() =>
                                setComponentEditModal((prev) => ({
                                    ...prev,
                                    open: false,
                                }))
                            }
                        >
                            Cancel
                        </Button>
                        <Button onClick={saveComponentEditForm}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
