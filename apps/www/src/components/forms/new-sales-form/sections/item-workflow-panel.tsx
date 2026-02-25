"use client";

import { useMemo, useState } from "react";
import { Button } from "@gnd/ui/button";
import { Menu } from "@gnd/ui/custom/menu";
import { Input } from "@gnd/ui/input";
import { env } from "@/env.mjs";
import {
    DoorOpen,
    Hammer,
    Layers3,
    Package2,
    Ruler,
    Trash2,
    WalletCards,
} from "lucide-react";
import { useNewSalesFormStore } from "../store";
import {
    useSalesDeleteSupplierMutation,
    useSalesSaveSupplierMutation,
    useSalesSuppliersQuery,
    useNewSalesFormStepRoutingQuery,
    useSalesStepComponentsQuery,
} from "../api";
import { DoorSizeQtyDialog, MouldingCalculatorDialog } from "./workflow-modals";

const AUTO_ADVANCE_TITLES = new Set([
    "height",
    "width",
    "hand",
    "door",
    "house package tool",
]);
const MULTI_SELECT_STEP_TITLES = new Set([
    "door",
    "moulding",
    "weatherstrip color",
]);

function normalizeTitle(value?: string | null) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function buildSelectedByStepUid(steps: any[]) {
    const selected: Record<string, string> = {};
    (steps || []).forEach((step) => {
        const stepUid = step?.step?.uid;
        const prodUid = step?.prodUid;
        if (stepUid && prodUid) selected[stepUid] = prodUid;
    });
    return selected;
}

function isComponentVisibleByRules(
    component: any,
    selectedByStepUid: Record<string, string>,
) {
    const variations = Array.isArray(component?.variations)
        ? component.variations
        : [];
    if (!variations.length) return true;
    for (const variation of variations) {
        const rules = Array.isArray(variation?.rules) ? variation.rules : [];
        if (!rules.length) continue;
        const matches = rules.every((rule: any) => {
            const stepUid = String(rule?.stepUid || "");
            const operator = String(rule?.operator || "is");
            const candidates = Array.isArray(rule?.componentsUid)
                ? rule.componentsUid.map((uid: any) => String(uid))
                : [];
            const selected = stepUid ? selectedByStepUid[stepUid] : null;
            if (!candidates.length) return true;
            if (!selected) return operator !== "is";
            if (operator === "isNot")
                return candidates.every((uid: string) => uid !== selected);
            return candidates.some((uid: string) => uid === selected);
        });
        if (matches) return true;
    }
    return false;
}

function resolveComponentPriceByDeps(
    component: any,
    selectedByStepUid: Record<string, string>,
) {
    const directSales = Number(component?.salesPrice);
    const directBase = Number(component?.basePrice);
    if (Number.isFinite(directSales) || Number.isFinite(directBase)) {
        return {
            salesPrice: Number.isFinite(directSales) ? directSales : null,
            basePrice: Number.isFinite(directBase) ? directBase : null,
        };
    }
    const pricing =
        component?.pricing ||
        component?.pricings ||
        component?.priceData ||
        null;
    if (!pricing || typeof pricing !== "object") {
        return {
            salesPrice: null,
            basePrice: null,
        };
    }
    const deps = Array.isArray(component?.priceStepDeps)
        ? component.priceStepDeps
        : Array.isArray(component?.meta?.priceStepDeps)
          ? component.meta.priceStepDeps
          : [];
    const depKey = deps
        .map((stepUid: string) => selectedByStepUid[stepUid] || "")
        .filter(Boolean)
        .join("-");
    const fallbackKey = String(component?.uid || "");
    const raw =
        (depKey && (pricing as any)[depKey]) ||
        (fallbackKey && (pricing as any)[fallbackKey]) ||
        null;
    const bucket = typeof raw === "number" ? { price: raw } : raw;
    const price = Number(bucket?.price);
    if (!Number.isFinite(price)) {
        return {
            salesPrice: null,
            basePrice: null,
        };
    }
    return {
        salesPrice: price,
        basePrice: price,
    };
}

function customNextStepTitle(
    doorType: string | null | undefined,
    currentStepTitle: string | null | undefined,
    currentValue: string | null | undefined,
) {
    const dt = normalizeTitle(doorType || currentValue);
    const step = normalizeTitle(currentStepTitle);
    const val = normalizeTitle(currentValue);

    const base: Record<string, string> = {
        "shelf items": "Shelf Items",
        "cutdown height": "House Package Tool",
        "jamb species": "Jamb Size",
        door: "Jamb Species",
        "jamb size": "Jamb Type",
    };

    if (dt === "moulding") {
        const moulding: Record<string, string> = {
            "item type": "Specie",
            specie: "Moulding",
            moulding: "Line Item",
        };
        return moulding[step] || null;
    }
    if (dt === "services") {
        return step === "item type" ? "Line Item" : null;
    }
    if (dt === "door slabs only") {
        const slab: Record<string, string> = {
            "item type": "Height",
            height: "Door Type",
            door: "House Package Tool",
        };
        return slab[step] || null;
    }
    if (dt === "bifold") {
        const bifold: Record<string, string> = {
            "item type": "Height",
            height: "Door Type",
            "door type": "Door",
            door: "House Package Tool",
        };
        return bifold[step] || null;
    }

    if (val && base[val]) return base[val];
    return base[step] || null;
}

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
function getSelectedProdUids(step: any) {
    const metaUids = Array.isArray(step?.meta?.selectedProdUids)
        ? step.meta.selectedProdUids
              .map((uid: unknown) => String(uid || "").trim())
              .filter(Boolean)
        : [];
    if (metaUids.length) return Array.from(new Set(metaUids));
    const prodUid = String(step?.prodUid || "").trim();
    return prodUid ? [prodUid] : [];
}
function compactStepValue(selectedComponents: any[]) {
    if (!selectedComponents.length) return "";
    if (selectedComponents.length === 1)
        return selectedComponents[0]?.title || "";
    const first = selectedComponents[0]?.title || "";
    return first
        ? `${first} +${selectedComponents.length - 1}`
        : `${selectedComponents.length} selected`;
}

function findStepByTitle(routeData: any, title: string | null) {
    if (!title) return null;
    const normalized = normalizeTitle(title);
    return (
        Object.values(routeData?.stepsByUid || {}).find(
            (step: any) => normalizeTitle(step.title) === normalized,
        ) || null
    );
}

function stepMatches(routeData: any, step: any, candidate: any) {
    if (!step || !candidate) return false;
    const stepUid = step.step?.uid || routeData?.stepsById?.[step.stepId || -1];
    return stepUid === candidate.uid || step.stepId === candidate.id;
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

function getItemType(line: any) {
    const step = (line?.formSteps || []).find(
        (s: any) => normalizeTitle(s?.step?.title) === "item type",
    );
    return normalizeTitle(step?.value);
}

function isMouldingItem(line: any) {
    return getItemType(line) === "moulding";
}
function isServiceItem(line: any) {
    const type = getItemType(line);
    return type === "services" || type === "service";
}
function isShelfItem(line: any) {
    return getItemType(line) === "shelf items";
}
function firstPendingStepIndex(steps: any[]) {
    const pending = steps.findIndex(
        (step) => !String(step?.prodUid || "").trim(),
    );
    return pending >= 0 ? pending : Math.max(0, steps.length - 1);
}

function findLineStepByTitle(line: any, title: string) {
    const normalized = normalizeTitle(title);
    return (line?.formSteps || []).find(
        (step: any) => normalizeTitle(step?.step?.title) === normalized,
    );
}

function getSelectedDoorComponentsForLine(line: any) {
    const doorStep = findLineStepByTitle(line, "Door");
    const selected = Array.isArray(doorStep?.meta?.selectedComponents)
        ? doorStep.meta.selectedComponents
              .map((component: any) => ({
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
              }))
              .filter((component: any) => !!component.uid)
        : [];
    if (selected.length) return selected;
    const prodUid = String(doorStep?.prodUid || "").trim();
    if (!prodUid) return [];
    return [
        {
            id: doorStep?.componentId ?? null,
            uid: prodUid,
            title: doorStep?.value || "Door",
            img: doorStep?.meta?.img || null,
            salesPrice:
                doorStep?.price == null ? null : Number(doorStep.price || 0),
            basePrice:
                doorStep?.basePrice == null
                    ? null
                    : Number(doorStep.basePrice || 0),
            pricing: null,
        },
    ];
}

function getSelectedMouldingComponentsForLine(line: any) {
    const mouldingStep = findLineStepByTitle(line, "Moulding");
    const selected = Array.isArray(mouldingStep?.meta?.selectedComponents)
        ? mouldingStep.meta.selectedComponents
              .map((component: any) => ({
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
              }))
              .filter((component: any) => !!component.uid)
        : [];
    if (selected.length) return selected;
    const prodUid = String(mouldingStep?.prodUid || "").trim();
    if (!prodUid) return [];
    return [
        {
            id: mouldingStep?.componentId ?? null,
            uid: prodUid,
            title: mouldingStep?.value || "Moulding",
            img: mouldingStep?.meta?.img || null,
            salesPrice:
                mouldingStep?.price == null
                    ? null
                    : Number(mouldingStep.price || 0),
            basePrice:
                mouldingStep?.basePrice == null
                    ? null
                    : Number(mouldingStep.basePrice || 0),
        },
    ];
}

function resolveSizeFromPricingKey(
    key: string,
    supplierUid?: string | null,
) {
    const raw = String(key || "").trim();
    if (!raw) return null;
    if (supplierUid) {
        const suffix = `& ${supplierUid}`;
        if (raw.endsWith(suffix)) {
            const size = raw.slice(0, -suffix.length).trim();
            return size.includes("x") ? size : null;
        }
    }
    if (raw.includes(" & ")) {
        const size = raw.split(" & ")[0]?.trim() || "";
        return size.includes("x") ? size : null;
    }
    return raw.includes("x") ? raw : null;
}


function summarizeDoors(rows: any[]) {
    const normalized = (rows || []).map((row) => {
        const lhQty = Number(row?.lhQty || 0);
        const rhQty = Number(row?.rhQty || 0);
        const totalQty =
            lhQty + rhQty > 0 ? lhQty + rhQty : Number(row?.totalQty || 0);
        const unitPrice = Number(row?.unitPrice || 0);
        return {
            ...row,
            lhQty,
            rhQty,
            totalQty,
            unitPrice,
            lineTotal: Number((totalQty * unitPrice).toFixed(2)),
        };
    });
    const totalDoors = normalized.reduce(
        (sum, row) => sum + Number(row?.totalQty || 0),
        0,
    );
    const totalPrice = normalized.reduce(
        (sum, row) => sum + Number(row?.lineTotal || 0),
        0,
    );
    return {
        rows: normalized,
        totalDoors,
        totalPrice: Number(totalPrice.toFixed(2)),
    };
}

function componentLabel(value?: string | null) {
    return String(value || "").trim().toUpperCase();
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
    const [supplierNameInput, setSupplierNameInput] = useState("");
    const [editingSupplier, setEditingSupplier] = useState<{
        id: number;
        name: string;
    } | null>(null);

    const stepRoutingQuery = useNewSalesFormStepRoutingQuery({});
    const routeData = stepRoutingQuery.data;
    const suppliersQuery = useSalesSuppliersQuery(true);
    const saveSupplierMutation = useSalesSaveSupplierMutation();
    const deleteSupplierMutation = useSalesDeleteSupplierMutation();

    const activeLine =
        record?.lineItems?.find((line) => line.uid === editor.activeItem) ||
        record?.lineItems?.[0] ||
        null;
    const activeLineSteps = activeLine?.formSteps || [];
    const activeStepIndex =
        activeLine == null
            ? 0
            : (activeStepByLine[activeLine.uid] ??
              Math.max(0, activeLineSteps.length - 1));
    const activeStep = activeLineSteps[activeStepIndex] || null;
    const activeDoorStep = activeLine
        ? findLineStepByTitle(activeLine, "Door")
        : null;

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

    const visibleComponents = useMemo(() => {
        const selectedByStepUid = buildSelectedByStepUid(activeLineSteps);
        return (stepComponentsQuery.data || [])
            .filter((component) => !component.isDeleted)
            .filter(
                (component) =>
                    !(component as any)?._metaData?.custom &&
                    !(component as any)?.custom,
            )
            .filter((component) =>
                isComponentVisibleByRules(component, selectedByStepUid),
            )
            .map((component) => {
                const price = resolveComponentPriceByDeps(
                    component,
                    selectedByStepUid,
                );
                return {
                    ...component,
                    salesPrice:
                        component?.salesPrice == null
                            ? price.salesPrice
                            : component.salesPrice,
                    basePrice:
                        component?.basePrice == null
                            ? price.basePrice
                            : component.basePrice,
                };
            });
    }, [stepComponentsQuery.data, activeLineSteps]);
    const activeRootComponents = useMemo(() => {
        const roots = rootComponentsQuery.data || [];
        const configured = new Set(
            Object.keys(routeData?.composedRouter || {}),
        );
        if (!configured.size) return [];
        const selectedByStepUid = buildSelectedByStepUid(activeLineSteps);
        return roots
            .filter((component: any) => configured.has(component.uid))
            .filter(
                (component: any) =>
                    !component?._metaData?.custom && !component?.custom,
            )
            .filter((component: any) =>
                isComponentVisibleByRules(component, selectedByStepUid),
            )
            .map((component: any) => {
                const price = resolveComponentPriceByDeps(
                    component,
                    selectedByStepUid,
                );
                return {
                    ...component,
                    salesPrice:
                        component?.salesPrice == null
                            ? price.salesPrice
                            : component.salesPrice,
                    basePrice:
                        component?.basePrice == null
                            ? price.basePrice
                            : component.basePrice,
                };
            });
    }, [routeData, rootComponentsQuery.data, activeLineSteps]);
    const activeDoorSupplier = getDoorSupplierMeta(activeDoorStep || activeStep);
    if (!record) return null;

    function resolveNextStep({
        line,
        steps,
        currentStepIndex,
        selectedComponent,
    }: {
        line: (typeof record.lineItems)[number];
        steps: any[];
        currentStepIndex: number;
        selectedComponent: {
            uid: string;
            title?: string | null;
            redirectUid?: string | null;
        };
    }) {
        if (!routeData || !steps[currentStepIndex]) return null;

        const currentStep = steps[currentStepIndex];
        const rootComponentUid = steps[0]?.prodUid;
        const rootRoute = rootComponentUid
            ? routeData.composedRouter?.[rootComponentUid]
            : null;

        const currentStepUid =
            currentStep.step?.uid ||
            routeData.stepsById?.[currentStep.stepId || -1];

        let nextStep: any = selectedComponent.redirectUid
            ? routeData.stepsByUid?.[selectedComponent.redirectUid]
            : null;

        if (!nextStep && currentStepUid && rootRoute) {
            const nextUid = rootRoute.route?.[currentStepUid];
            if (nextUid) nextStep = routeData.stepsByUid?.[nextUid];
        }

        if (!nextStep) {
            const customTitle = customNextStepTitle(
                (line.meta as any)?.doorType || null,
                currentStep.step?.title,
                selectedComponent.title || currentStep.value,
            );
            nextStep = findStepByTitle(routeData, customTitle);
        }

        return nextStep || null;
    }

    function seedStep(step: any, selectedComponent?: any) {
        return {
            id: null,
            stepId: step.id,
            componentId: selectedComponent?.id || null,
            prodUid: selectedComponent?.uid || "",
            value: selectedComponent?.title || "",
            meta: selectedComponent?.img
                ? {
                      img: selectedComponent.img,
                  }
                : {},
            step: {
                id: step.id,
                uid: step.uid,
                title: step.title || "",
            },
        };
    }
    function buildConfiguredRouteSteps(rootStep: any, selectedComponent: any) {
        const initial = [seedStep(rootStep, selectedComponent)];
        const route = routeData?.composedRouter?.[selectedComponent?.uid];
        const sequenceUids: string[] = Array.isArray(route?.routeSequence)
            ? route.routeSequence
                  .map((entry: any) => String(entry?.uid || ""))
                  .filter(Boolean)
            : [];
        if (!sequenceUids.length) return initial;

        const deduped = Array.from(new Set(sequenceUids));
        const routeSteps = deduped
            .map((uid) => routeData?.stepsByUid?.[uid])
            .filter(Boolean)
            .map((step) => seedStep(step));
        return [...initial, ...routeSteps];
    }
    function mergeSeriesWithExisting(
        existingSteps: any[],
        configuredSteps: any[],
    ) {
        return configuredSteps.map((seriesStep, index) => {
            if (index === 0) return seriesStep;
            const routeUid = seriesStep?.step?.uid;
            const routeId = seriesStep?.stepId;
            const existing = existingSteps.find(
                (step) =>
                    (routeUid && step?.step?.uid === routeUid) ||
                    (routeId != null && step?.stepId === routeId),
            );
            if (!existing) return seriesStep;
            return {
                ...seriesStep,
                ...existing,
                stepId: seriesStep.stepId ?? existing.stepId ?? null,
                step: {
                    ...(existing.step || {}),
                    ...(seriesStep.step || {}),
                },
            };
        });
    }

    function applyRouteRecursion({
        line,
        steps,
        startIndex,
        selectedComponent,
    }: {
        line: (typeof record.lineItems)[number];
        steps: any[];
        startIndex: number;
        selectedComponent: any;
    }) {
        const nextSteps = [...steps];
        let currentIndex = startIndex;
        let currentComponent = selectedComponent;
        const visited = new Set<string>();

        for (let i = 0; i < 12; i++) {
            const nextStep = resolveNextStep({
                line,
                steps: nextSteps,
                currentStepIndex: currentIndex,
                selectedComponent: currentComponent,
            });

            if (!nextStep) break;
            if (visited.has(nextStep.uid)) break;
            visited.add(nextStep.uid);

            const existingIndex = nextSteps.findIndex((step) =>
                stepMatches(routeData, step, nextStep),
            );
            if (existingIndex >= 0) {
                currentIndex = existingIndex;
                break;
            }

            const routeStep = routeData?.stepsByUid?.[nextStep.uid];
            const candidates = (routeStep?.components || []).filter(
                (component: any) => !!component.uid,
            );
            const hiddenAuto = AUTO_ADVANCE_TITLES.has(
                normalizeTitle(nextStep.title),
            );

            if (!candidates.length) {
                const virtualSteps = [...nextSteps, seedStep(nextStep)];
                const virtualNext = resolveNextStep({
                    line,
                    steps: virtualSteps,
                    currentStepIndex: virtualSteps.length - 1,
                    selectedComponent: {
                        uid: "",
                        title: nextStep.title,
                    },
                });
                if (!virtualNext) break;
                if (visited.has(virtualNext.uid)) break;
                nextSteps.push(seedStep(nextStep));
                currentIndex = nextSteps.length - 1;
                currentComponent = {
                    uid: "",
                    title: nextStep.title,
                };
                continue;
            }

            if (candidates.length === 1 || hiddenAuto) {
                const auto = candidates[0];
                nextSteps.push(seedStep(nextStep, auto));
                currentIndex = nextSteps.length - 1;
                currentComponent = auto;
                continue;
            }

            nextSteps.push(seedStep(nextStep));
            currentIndex = nextSteps.length - 1;
            break;
        }

        return {
            steps: nextSteps,
            activeIndex: currentIndex,
        };
    }

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
            const selectedSet = new Set(getSelectedProdUids(current));
            const nextSelected =
                typeof selectedOverride === "boolean"
                    ? selectedOverride
                    : !selectedSet.has(component.uid);
            if (nextSelected) selectedSet.add(component.uid);
            else selectedSet.delete(component.uid);

            const selectedUids = Array.from(selectedSet);
            const selectedComponents = selectedUids
                .map((uid) =>
                    visibleComponents.find(
                        (candidate: any) => candidate.uid === uid,
                    ),
                )
                .filter(Boolean);
            const primary = selectedComponents[0] || null;
            const totalSales = selectedComponents.reduce(
                (sum, c: any) => sum + Number(c?.salesPrice || 0),
                0,
            );
            const totalBase = selectedComponents.reduce(
                (sum, c: any) => sum + Number(c?.basePrice || 0),
                0,
            );

            nextSteps[currentStepIndex] = {
                ...current,
                componentId: primary?.id || null,
                prodUid: primary?.uid || "",
                value: compactStepValue(selectedComponents),
                price: selectedComponents.length ? totalSales : 0,
                basePrice: selectedComponents.length ? totalBase : 0,
                meta: {
                    ...(current.meta || {}),
                    img: primary?.img || null,
                    selectedProdUids: selectedUids,
                    selectedComponents: selectedComponents.map((c: any) => ({
                        id: c.id ?? null,
                        uid: c.uid,
                        title: c.title,
                        img: c.img || null,
                        salesPrice:
                            c.salesPrice == null
                                ? null
                                : Number(c.salesPrice || 0),
                        basePrice:
                            c.basePrice == null
                                ? null
                                : Number(c.basePrice || 0),
                    })),
                },
                step: {
                    ...(current.step || {
                        id: current.stepId || null,
                        title: "",
                    }),
                    title: current.step?.title || activeStep?.step?.title || "",
                },
            };

            if (!selectedComponents.length) {
                updateLineItem(line.uid, {
                    formSteps: nextSteps.slice(0, currentStepIndex + 1),
                });
                setActiveStepByLine((prev) => ({
                    ...prev,
                    [line.uid]: currentStepIndex,
                }));
                return;
            }
            updateLineItem(line.uid, {
                formSteps: nextSteps,
            });
            setActiveStepByLine((prev) => ({
                ...prev,
                [line.uid]: currentStepIndex,
            }));
            return;
        }

        nextSteps[currentStepIndex] = {
            ...current,
            componentId: component.id,
            prodUid: component.uid,
            value: component.title,
            price:
                component.salesPrice == null
                    ? current.price
                    : Number(component.salesPrice || 0),
            basePrice:
                component.basePrice == null
                    ? current.basePrice
                    : Number(component.basePrice || 0),
            meta: {
                ...(current.meta || {}),
                img: component.img || null,
            },
            step: {
                ...(current.step || {
                    id: current.stepId || null,
                    title: "",
                }),
                title: current.step?.title || activeStep?.step?.title || "",
            },
        };

        const selectedStepTitle = normalizeTitle(
            nextSteps[currentStepIndex]?.step?.title,
        );
        const isItemTypeStep =
            currentStepIndex === 0 || selectedStepTitle === "item type";
        if (isItemTypeStep) {
            const rootUid =
                nextSteps[currentStepIndex]?.step?.uid ||
                routeData?.stepsById?.[
                    nextSteps[currentStepIndex]?.stepId || -1
                ] ||
                routeData?.rootStepUid;
            const rootStep = rootUid ? routeData?.stepsByUid?.[rootUid] : null;
            if (rootStep) {
                const configuredSeries = buildConfiguredRouteSteps(
                    rootStep,
                    component,
                );
                const mergedSeries = mergeSeriesWithExisting(
                    nextSteps,
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

        const routed = applyRouteRecursion({
            line,
            steps: nextSteps,
            startIndex: currentStepIndex,
            selectedComponent: {
                uid: component.uid,
                title: component.title,
                redirectUid: component.redirectUid,
            },
        });

        updateLineItem(line.uid, {
            formSteps: routed.steps,
        });
        const autoNext =
            routed.steps[currentStepIndex + 1] != null
                ? currentStepIndex + 1
                : routed.activeIndex;
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
        const routed = applyRouteRecursion({
            line,
            steps,
            startIndex: stepIndex,
            selectedComponent: {
                uid: primary.uid,
                title: primary.title,
                redirectUid: primary.redirectUid,
            },
        });
        updateLineItem(line.uid, {
            formSteps: routed.steps,
        });
        const nextIndex =
            routed.steps[stepIndex + 1] != null
                ? stepIndex + 1
                : routed.activeIndex;
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

        const routedSteps = buildConfiguredRouteSteps(rootStep, component);

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
        updateLineItem(line.uid, {
            formSteps: steps,
        });
    }
    function getRouteConfigForLine(
        line: (typeof record.lineItems)[number],
        step: any,
        component?: any,
    ) {
        const rootComponentUid = line?.formSteps?.[0]?.prodUid;
        const routeConfigRaw =
            routeData?.composedRouter?.[rootComponentUid]?.config;
        const config = {
            ...(routeConfigRaw && typeof routeConfigRaw === "object"
                ? routeConfigRaw
                : {}),
        } as Record<string, any>;
        const override = component?.sectionOverride;
        if (override?.overrideMode) {
            if (typeof override.noHandle === "boolean")
                config.noHandle = override.noHandle;
            if (typeof override.hasSwing === "boolean")
                config.hasSwing = override.hasSwing;
        }
        if (step?.meta?.sectionOverride?.overrideMode) {
            if (typeof step.meta.sectionOverride.noHandle === "boolean")
                config.noHandle = step.meta.sectionOverride.noHandle;
            if (typeof step.meta.sectionOverride.hasSwing === "boolean")
                config.hasSwing = step.meta.sectionOverride.hasSwing;
        }
        return config;
    }
    function renderHousePackageToolPanel(
        line: (typeof record.lineItems)[number],
        activeItemStep: any,
    ) {
        const rows = line.housePackageTool?.doors || [];
        const summary = summarizeDoors(rows);
        const routeConfig = getRouteConfigForLine(line, activeItemStep);
        const noHandle = !!routeConfig?.noHandle;
        const hasSwing = !!routeConfig?.hasSwing;
        const doorStep = findLineStepByTitle(line, "Door");
        const supplier = getDoorSupplierMeta(doorStep);
        const selectedDoorComponents = getSelectedDoorComponentsForLine(line);
        const activeDoorUid =
            activeHptDoorUidByLine[line.uid] || selectedDoorComponents[0]?.uid || "";
        const activeDoorComponent =
            selectedDoorComponents.find((component) => component.uid === activeDoorUid) ||
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
            const pricing = activeDoorComponent?.pricing || {};
            const keys = Object.keys(pricing || {});
            const sizes = Array.from(
                new Set(
                    keys
                        .map((key) =>
                            resolveSizeFromPricingKey(key, supplier.supplierUid),
                        )
                        .filter(Boolean) as string[],
                ),
            );
            return sizes.filter((size) => {
                return !focusedRows.some(
                    (row) => String(row?.dimension || "").trim() === size,
                );
            });
        })();

        const componentLookupById = new Map<
            number,
            { title: string; img?: string | null }
        >();
        (line.formSteps || []).forEach((step: any) => {
            const componentId = Number(step?.componentId || 0);
            if (componentId > 0) {
                componentLookupById.set(componentId, {
                    title: step?.value || step?.step?.title || `Component ${componentId}`,
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
                            component?.title || step?.step?.title || `Component ${selectedId}`,
                        img: component?.img || null,
                    });
                }
            });
        });

        function applyRows(nextRows: any[]) {
            const next = summarizeDoors(nextRows);
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
            const supplierKey = supplier.supplierUid
                ? `${size} & ${supplier.supplierUid}`
                : null;
            const priceBucket =
                (supplierKey ? pricing?.[supplierKey] : null) ||
                pricing?.[size] ||
                null;
            const computedPrice = Number(priceBucket?.price);
            const unitPrice = Number.isFinite(computedPrice)
                ? computedPrice
                : Number(
                      activeDoorComponent?.salesPrice ??
                          activeDoorComponent?.basePrice ??
                          0,
                  );
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
                    unitPrice,
                    lhQty: 0,
                    rhQty: 0,
                    totalQty: 0,
                    lineTotal: 0,
                    stepProductId: activeDoorComponent.id || null,
                    meta: {},
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
                        ) : null}
                    </div>
                    {selectedDoorComponents.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {selectedDoorComponents.map((component) => {
                                const selected = component.uid === activeDoorUid;
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
                                            setActiveHptDoorUidByLine((prev) => ({
                                                ...prev,
                                                [line.uid]: component.uid,
                                            }))
                                        }
                                    >
                                        {componentLabel(component.title || component.uid)}
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
                            Select at least one DOOR component first, then continue to HOUSE PACKAGE TOOL.
                        </div>
                    ) : !summary.rows.length ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                            Select a door component and apply size quantities to build the package.
                        </div>
                    ) : (
                        (() => {
                            const componentId = Number(activeDoorComponent?.id || 0);
                            const component =
                                componentLookupById.get(componentId) || activeDoorComponent;
                            const rowsForComponent = focusedRows;
                            if (!rowsForComponent.length) {
                                return (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                                        No size rows for {componentLabel(component?.title || "selected door")} yet.
                                        Click <span className="font-semibold">Configure Sizes</span> to add them.
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
                                            {resolveComponentImageSrc(component?.img) ? (
                                                <img
                                                    src={resolveComponentImageSrc(component?.img) || ""}
                                                    alt={component?.title || `Component ${componentId}`}
                                                    className="h-full w-full object-contain p-1"
                                                />
                                            ) : (
                                                <Ruler size={15} className="text-slate-500" />
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
                                                {rowsForComponent.length} size row
                                                {rowsForComponent.length > 1 ? "s" : ""}
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
                                                    availableSizes.map((size) => (
                                                        <Menu.Item
                                                            key={`add-size-${componentId}-${size}`}
                                                            onClick={() =>
                                                                addSizeRow(size)
                                                            }
                                                        >
                                                            {size}
                                                        </Menu.Item>
                                                    ))
                                                )}
                                            </Menu>
                                        </div>
                                    </header>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    <th className="px-3 py-2">Size</th>
                                                    {hasSwing ? (
                                                        <th className="px-3 py-2">Swing</th>
                                                    ) : null}
                                                    {noHandle ? (
                                                        <th className="px-3 py-2 text-right">Qty</th>
                                                    ) : (
                                                        <>
                                                            <th className="px-3 py-2 text-right">LH</th>
                                                            <th className="px-3 py-2 text-right">RH</th>
                                                            <th className="px-3 py-2 text-right">Total</th>
                                                        </>
                                                    )}
                                                    <th className="px-3 py-2 text-right">Unit</th>
                                                    <th className="px-3 py-2 text-right">Line</th>
                                                    <th className="px-3 py-2 text-right">Remove</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rowsForComponent.map((row, index) => (
                                                    <tr
                                                        key={`hpt-row-${componentId}-${index}`}
                                                        className="border-b border-slate-100 last:border-0"
                                                    >
                                                        <td className="px-3 py-2 font-medium text-slate-800">
                                                            {row.dimension || "--"}
                                                        </td>
                                                        {hasSwing ? (
                                                            <td className="px-3 py-2">
                                                                <Input
                                                                    value={row.swing || ""}
                                                                    onChange={(e) =>
                                                                        patchRow(row, {
                                                                            swing: e.target.value,
                                                                        })
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
                                                                    value={Number(row.totalQty || 0)}
                                                                    onChange={(e) =>
                                                                        patchRow(row, {
                                                                            totalQty: Number(
                                                                                e.target.value || 0,
                                                                            ),
                                                                            lhQty: 0,
                                                                            rhQty: 0,
                                                                        })
                                                                    }
                                                                    className="h-8 rounded-md border-slate-200 text-right text-xs"
                                                                />
                                                            </td>
                                                        ) : (
                                                            <>
                                                                <td className="px-3 py-2">
                                                                    <Input
                                                                        type="number"
                                                                        value={Number(row.lhQty || 0)}
                                                                        onChange={(e) =>
                                                                            patchRow(row, {
                                                                                lhQty: Number(
                                                                                    e.target.value || 0,
                                                                                ),
                                                                            })
                                                                        }
                                                                        className="h-8 rounded-md border-slate-200 text-right text-xs"
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    <Input
                                                                        type="number"
                                                                        value={Number(row.rhQty || 0)}
                                                                        onChange={(e) =>
                                                                            patchRow(row, {
                                                                                rhQty: Number(
                                                                                    e.target.value || 0,
                                                                                ),
                                                                            })
                                                                        }
                                                                        className="h-8 rounded-md border-slate-200 text-right text-xs"
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
                                                                    {Number(row.totalQty || 0)}
                                                                </td>
                                                            </>
                                                        )}
                                                        <td className="px-3 py-2">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={Number(row.unitPrice || 0)}
                                                                onChange={(e) =>
                                                                    patchRow(row, {
                                                                        unitPrice: Number(
                                                                            e.target.value || 0,
                                                                        ),
                                                                    })
                                                                }
                                                                className="h-8 rounded-md border-slate-200 text-right text-xs"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-xs font-semibold text-slate-900">
                                                            {money(row.lineTotal) || "$0.00"}
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
                                                ))}
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
        const byUid = new Map(
            selectedMouldings.map((component: any) => [component.uid, component]),
        );
        const existingRows = Array.isArray((line.meta as any)?.mouldingRows)
            ? ((line.meta as any)?.mouldingRows as any[])
            : [];
        const existingByUid = new Map(
            existingRows.map((row: any) => [String(row.uid), row]),
        );
        const initialRows = selectedMouldings.map((component: any) => {
            const existing = existingByUid.get(String(component.uid));
            return {
                uid: component.uid,
                title: component.title,
                description:
                    String(existing?.description || "").trim() ||
                    component.title ||
                    "Moulding",
                qty: Number(existing?.qty ?? 1),
                addon: Number(existing?.addon ?? 0),
                customPrice:
                    existing?.customPrice == null || existing?.customPrice === ""
                        ? null
                        : Number(existing.customPrice || 0),
                salesPrice: Number(
                    existing?.salesPrice ?? component?.salesPrice ?? 0,
                ),
                basePrice: Number(
                    existing?.basePrice ?? component?.basePrice ?? 0,
                ),
            };
        });
        const sharedComponentPrice = (line.formSteps || [])
            .filter((step: any) => {
                const title = normalizeTitle(step?.step?.title);
                return title !== "line item" && title !== "moulding";
            })
            .reduce((sum, step: any) => sum + Number(step?.price || 0), 0);
        const rows = initialRows.map((row: any) => {
            const component = byUid.get(row.uid);
            const componentPrice = Number(
                row.salesPrice ?? component?.salesPrice ?? 0,
            );
            const qty = Number(row.qty || 0);
            const addon = Number(row.addon || 0);
            const customPrice =
                row.customPrice == null || row.customPrice === ""
                    ? null
                    : Number(row.customPrice || 0);
            const estimateUnit = Number(sharedComponentPrice + componentPrice);
            const unit =
                customPrice == null
                    ? estimateUnit + addon
                    : Number(customPrice) + addon;
            const lineTotal = Number((qty * unit).toFixed(2));
            return {
                ...row,
                title: row.title || component?.title || "Moulding",
                description:
                    row.description ||
                    component?.title ||
                    row.title ||
                    "Moulding",
                qty,
                addon,
                customPrice,
                salesPrice: componentPrice,
                basePrice: Number(row.basePrice ?? component?.basePrice ?? 0),
                estimateUnit,
                unit,
                lineTotal,
            };
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
            const nextRows = nextRowsRaw.map((row: any) => ({
                uid: row.uid,
                title: row.title,
                description: row.description,
                qty: Number(row.qty || 0),
                addon: Number(row.addon || 0),
                customPrice:
                    row.customPrice == null || row.customPrice === ""
                        ? null
                        : Number(row.customPrice || 0),
                salesPrice: Number(row.salesPrice || 0),
                basePrice: Number(row.basePrice || 0),
            }));
            const recalc = nextRows.map((row: any) => {
                const estimateUnit = Number(
                    sharedComponentPrice + Number(row.salesPrice || 0),
                );
                const unit =
                    row.customPrice == null
                        ? estimateUnit + Number(row.addon || 0)
                        : Number(row.customPrice || 0) + Number(row.addon || 0);
                return {
                    ...row,
                    lineTotal: Number((Number(row.qty || 0) * unit).toFixed(2)),
                };
            });
            const nextQty = recalc.reduce(
                (sum, row: any) => sum + Number(row.qty || 0),
                0,
            );
            const nextTotal = Number(
                recalc
                    .reduce((sum, row: any) => sum + Number(row.lineTotal || 0), 0)
                    .toFixed(2),
            );
            updateLineItem(line.uid, {
                meta: {
                    ...(line.meta || {}),
                    mouldingRows: nextRows,
                } as any,
                qty: nextQty || line.qty,
                lineTotal: nextTotal || line.lineTotal,
                unitPrice:
                    nextQty > 0
                        ? Number((nextTotal / nextQty).toFixed(2))
                        : line.unitPrice,
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
                    selectedComponents: remainingComponents.map((component: any) => ({
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
                    })),
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
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Moulding Line Items
                    </p>
                    <div className="ml-auto flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsMouldingDialogOpen(true)}
                        >
                            Moulding Calculator
                        </Button>
                    </div>
                </div>
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
                                    <th className="px-3 py-2 text-right">Qty</th>
                                    <th className="px-3 py-2 text-right">Estimate</th>
                                    <th className="px-3 py-2 text-right">Addon/Qty</th>
                                    <th className="px-3 py-2 text-right">Custom</th>
                                    <th className="px-3 py-2 text-right">Line Total</th>
                                    <th className="px-3 py-2 text-right">Remove</th>
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
                                            <Input
                                                type="number"
                                                value={row.qty}
                                                onChange={(e) =>
                                                    persistRows(
                                                        rows.map((item: any, i: number) =>
                                                            i === index
                                                                ? {
                                                                      ...item,
                                                                      qty: Number(
                                                                          e.target.value || 0,
                                                                      ),
                                                                  }
                                                                : item,
                                                        ),
                                                    )
                                                }
                                                className="h-8 text-right"
                                            />
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
                                                        rows.map((item: any, i: number) =>
                                                            i === index
                                                                ? {
                                                                      ...item,
                                                                      addon: Number(
                                                                          e.target.value || 0,
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
                                                        rows.map((item: any, i: number) =>
                                                            i === index
                                                                ? {
                                                                      ...item,
                                                                      customPrice:
                                                                          e.target.value === ""
                                                                              ? null
                                                                              : Number(
                                                                                    e.target.value ||
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
                                    <td className="px-3 py-2 uppercase">Total</td>
                                    <td className="px-3 py-2 text-right">{aggregatedQty}</td>
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
        const rows =
            existingRows.length > 0
                ? existingRows.map((row: any, index: number) => {
                      const qty = Number(row?.qty ?? 0);
                      const unitPrice = Number(row?.unitPrice ?? 0);
                      return {
                          uid:
                              String(row?.uid || "").trim() ||
                              `service-${line.uid}-${index + 1}`,
                          service: String(
                              row?.service ?? row?.description ?? "",
                          ),
                          qty,
                          unitPrice,
                          lineTotal: Number((qty * unitPrice).toFixed(2)),
                      };
                  })
                : [
                      {
                          uid: `service-${line.uid}-1`,
                          service: String(line.description || "").trim(),
                          qty: Number(line.qty ?? 1),
                          unitPrice: Number(line.unitPrice ?? 0),
                          lineTotal: Number(
                              (
                                  Number(line.qty ?? 1) *
                                  Number(line.unitPrice ?? 0)
                              ).toFixed(2),
                          ),
                      },
                  ];

        function persistRows(nextRowsRaw: any[]) {
            const nextRows = nextRowsRaw.map((row: any, index: number) => {
                const qty = Number(row?.qty ?? 0);
                const unitPrice = Number(row?.unitPrice ?? 0);
                return {
                    uid:
                        String(row?.uid || "").trim() ||
                        `service-${line.uid}-${index + 1}`,
                    service: String(row?.service ?? "").trim(),
                    qty,
                    unitPrice,
                    lineTotal: Number((qty * unitPrice).toFixed(2)),
                };
            });
            const qtyTotal = nextRows.reduce(
                (sum: number, row: any) => sum + Number(row.qty || 0),
                0,
            );
            const lineTotal = Number(
                nextRows
                    .reduce(
                        (sum: number, row: any) => sum + Number(row.lineTotal || 0),
                        0,
                    )
                    .toFixed(2),
            );
            const unitPrice =
                qtyTotal > 0 ? Number((lineTotal / qtyTotal).toFixed(2)) : 0;
            updateLineItem(line.uid, {
                meta: {
                    ...(line.meta || {}),
                    serviceRows: nextRows,
                } as any,
                qty: qtyTotal,
                unitPrice,
                lineTotal,
                description: nextRows
                    .map((row: any) => String(row?.service || "").trim())
                    .filter(Boolean)
                    .join(" | "),
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
                                <th className="w-24 px-3 py-2 text-right">Qty</th>
                                <th className="w-28 px-3 py-2 text-right">Price</th>
                                <th className="w-28 px-3 py-2 text-right">Total</th>
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
                                                    rows.map((item: any, i: number) =>
                                                        i === index
                                                            ? {
                                                                  ...item,
                                                                  service:
                                                                      e.target.value,
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
                                                    rows.map((item: any, i: number) =>
                                                        i === index
                                                            ? {
                                                                  ...item,
                                                                  qty: Number(
                                                                      e.target.value ||
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
                                                    rows.map((item: any, i: number) =>
                                                        i === index
                                                            ? {
                                                                  ...item,
                                                                  unitPrice: Number(
                                                                      e.target.value ||
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
                                                disabled={rows.length <= 1}
                                                className="text-red-600"
                                                onClick={() =>
                                                    persistRows(
                                                        rows.filter(
                                                            (_: any, i: number) =>
                                                                i !== index,
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
        const isHptStep = isHousePackageToolStepTitle(activeItemStep?.step?.title);
        const selectedUids = new Set(getSelectedProdUids(activeItemStep));
        if (!steps.length) {
            return (
                <div className="space-y-3">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Root Step Components
                    </p>
                    {stepRoutingQuery.isPending ||
                    rootComponentsQuery.isPending ? (
                        <p className="text-sm text-muted-foreground">
                            Loading step routing...
                        </p>
                    ) : !activeRootComponents.length ? (
                        <p className="text-sm text-muted-foreground">
                            No root components found in sales settings route.
                        </p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                                                component.title || component.uid,
                                            )}
                                        </p>
                                        {moneyIfPositive(
                                            component.salesPrice ??
                                                component.basePrice ??
                                                component?.pricing?.[
                                                    component.uid
                                                ]?.price ??
                                                null,
                                        ) ? (
                                            <p className="text-xs font-medium text-primary">
                                                {moneyIfPositive(
                                                    component.salesPrice ??
                                                        component.basePrice ??
                                                        component?.pricing?.[
                                                            component.uid
                                                        ]?.price ??
                                                        null,
                                                )}
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

        return (
            <div className="space-y-3">
                <div className="mb-3 flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Select Component:{" "}
                        {activeItemStep?.step?.title || "Current Step"}
                    </p>
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
                        {isMouldingItem(line) ? (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsMouldingDialogOpen(true)}
                            >
                                Moulding Calculator
                            </Button>
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
                        <div className="flex items-center">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Shelf Items
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                className="ml-auto"
                                onClick={() =>
                                    updateLineItem(line.uid, {
                                        shelfItems: [
                                            ...(line.shelfItems || []),
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
                                        ],
                                    })
                                }
                            >
                                Add Shelf Row
                            </Button>
                        </div>
                        {(line.shelfItems || []).length ? (
                            <div className="space-y-2">
                                {(line.shelfItems || []).map((row, idx) => (
                                    <div
                                        key={`shelf-row-${idx}`}
                                        className="grid gap-2 md:grid-cols-12"
                                    >
                                        <Input
                                            className="md:col-span-5"
                                            value={row.description || ""}
                                            onChange={(e) =>
                                                updateLineItem(line.uid, {
                                                    shelfItems: (
                                                        line.shelfItems || []
                                                    ).map((item, i) =>
                                                        i === idx
                                                            ? {
                                                                  ...item,
                                                                  description:
                                                                      e.target
                                                                          .value,
                                                              }
                                                            : item,
                                                    ),
                                                })
                                            }
                                            placeholder="Description"
                                        />
                                        <Input
                                            className="md:col-span-2"
                                            type="number"
                                            value={row.qty || 0}
                                            onChange={(e) =>
                                                updateLineItem(line.uid, {
                                                    shelfItems: (
                                                        line.shelfItems || []
                                                    ).map((item, i) => {
                                                        if (i !== idx)
                                                            return item;
                                                        const qty = Number(
                                                            e.target.value || 0,
                                                        );
                                                        return {
                                                            ...item,
                                                            qty,
                                                            totalPrice:
                                                                qty *
                                                                Number(
                                                                    item.unitPrice ||
                                                                        0,
                                                                ),
                                                        };
                                                    }),
                                                })
                                            }
                                            placeholder="Qty"
                                        />
                                        <Input
                                            className="md:col-span-2"
                                            type="number"
                                            step="0.01"
                                            value={row.unitPrice || 0}
                                            onChange={(e) =>
                                                updateLineItem(line.uid, {
                                                    shelfItems: (
                                                        line.shelfItems || []
                                                    ).map((item, i) => {
                                                        if (i !== idx)
                                                            return item;
                                                        const unitPrice =
                                                            Number(
                                                                e.target
                                                                    .value || 0,
                                                            );
                                                        return {
                                                            ...item,
                                                            unitPrice,
                                                            totalPrice:
                                                                Number(
                                                                    item.qty ||
                                                                        0,
                                                                ) * unitPrice,
                                                        };
                                                    }),
                                                })
                                            }
                                            placeholder="Unit"
                                        />
                                        <Input
                                            className="md:col-span-2"
                                            value={
                                                money(row.totalPrice) || "$0.00"
                                            }
                                            readOnly
                                        />
                                        <Button
                                            className="md:col-span-1"
                                            variant="destructive"
                                            onClick={() =>
                                                updateLineItem(line.uid, {
                                                    shelfItems: (
                                                        line.shelfItems || []
                                                    ).filter(
                                                        (_, i) => i !== idx,
                                                    ),
                                                })
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
                    <p className="text-sm text-muted-foreground">
                        Loading components...
                    </p>
                ) : !visibleComponents.length ? (
                    <p className="text-sm text-muted-foreground">
                        No components returned for this step.
                    </p>
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {visibleComponents.map((component) => {
                                const isSelected = selectedUids.has(
                                    component.uid,
                                );
                                return (
                                    <button
                                        key={component.uid}
                                        type="button"
                                        className={`overflow-hidden rounded-xl border text-left transition ${
                                            isSelected
                                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                : "bg-card hover:border-primary"
                                        }`}
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
                                                {componentLabel(component.title)}
                                            </p>
                                            {moneyIfPositive(
                                                component.salesPrice ??
                                                    component.basePrice ??
                                                    component?.pricing?.[
                                                        component.uid
                                                    ]?.price ??
                                                    null,
                                            ) ? (
                                                <p className="text-xs font-medium text-primary">
                                                    {moneyIfPositive(
                                                        component.salesPrice ??
                                                            component.basePrice ??
                                                            component?.pricing?.[
                                                                component.uid
                                                            ]?.price ??
                                                            null,
                                                    )}
                                                </p>
                                            ) : null}
                                        </div>
                                    </button>
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
                            activeStepByLine[line.uid] ??
                            Math.max(0, steps.length - 1);
                        const activeItemStep = steps[activeIndex];

                        return (
                            <div
                                key={line.uid}
                                className={`rounded-xl border-2 bg-background p-4 transition-all ${
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
                                                        : "text-muted-foreground"
                                                }`}
                                                onClick={() =>
                                                    setActiveStepByLine(
                                                        (prev) => ({
                                                            ...prev,
                                                            [line.uid]: si,
                                                        }),
                                                    )
                                                }
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
                    component={doorStepModal.component}
                    supplierUid={activeDoorSupplier.supplierUid}
                    supplierName={activeDoorSupplier.supplierName}
                    routeConfig={getRouteConfigForLine(
                        activeLine,
                        activeStep,
                        doorStepModal.component,
                    )}
                    onApply={({ rows, selected }) => {
                        if (!doorStepModal.component) return;
                        const existingDoors =
                            activeLine.housePackageTool?.doors || [];
                        const targetComponentId = Number(
                            doorStepModal.component.id || 0,
                        );
                        const retainedDoors = existingDoors.filter(
                            (door) =>
                                Number(door.stepProductId || 0) !==
                                targetComponentId,
                        );
                        const nextDoors = [
                            ...retainedDoors,
                            ...rows.map((row) => ({
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
                            saveSelectedComponent({
                                line: activeLine,
                                steps: activeLineSteps,
                                currentStepIndex: activeStepIndex,
                                component: doorStepModal.component,
                                selectedOverride: selected,
                            });
                        }
                    }}
                />
            ) : null}

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
        </>
    );
}
