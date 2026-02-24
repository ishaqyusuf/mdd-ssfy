"use client";

import { useMemo, useState } from "react";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { env } from "@/env.mjs";
import { useNewSalesFormStore } from "../store";
import {
    useNewSalesFormStepRoutingQuery,
    useSalesStepComponentsQuery,
} from "../api";
import { MouldingCalculatorDialog } from "./workflow-modals";

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
    return String(value || "").trim().toLowerCase();
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

function isComponentVisibleByRules(component: any, selectedByStepUid: Record<string, string>) {
    const variations = Array.isArray(component?.variations) ? component.variations : [];
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
            if (operator === "isNot") return candidates.every((uid: string) => uid !== selected);
            return candidates.some((uid: string) => uid === selected);
        });
        if (matches) return true;
    }
    return false;
}

function resolveComponentPriceByDeps(component: any, selectedByStepUid: Record<string, string>) {
    const directSales = Number(component?.salesPrice);
    const directBase = Number(component?.basePrice);
    if (Number.isFinite(directSales) || Number.isFinite(directBase)) {
        return {
            salesPrice: Number.isFinite(directSales) ? directSales : null,
            basePrice: Number.isFinite(directBase) ? directBase : null,
        };
    }
    const pricing =
        component?.pricing || component?.pricings || component?.priceData || null;
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
    if (selectedComponents.length === 1) return selectedComponents[0]?.title || "";
    const first = selectedComponents[0]?.title || "";
    return first ? `${first} +${selectedComponents.length - 1}` : `${selectedComponents.length} selected`;
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
function moneyAny(value?: number | null) {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) return null;
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
    const base = String(env.NEXT_PUBLIC_CLOUDINARY_BASE_URL || "").replace(/\/$/, "");
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
    const pending = steps.findIndex((step) => !String(step?.prodUid || "").trim());
    return pending >= 0 ? pending : Math.max(0, steps.length - 1);
}

export function ItemWorkflowPanel() {
    const record = useNewSalesFormStore((s) => s.record);
    const addLineItem = useNewSalesFormStore((s) => s.addLineItem);
    const updateLineItem = useNewSalesFormStore((s) => s.updateLineItem);
    const removeLineItem = useNewSalesFormStore((s) => s.removeLineItem);
    const editor = useNewSalesFormStore((s) => s.editor);
    const setEditor = useNewSalesFormStore((s) => s.setEditor);

    const [activeStepByLine, setActiveStepByLine] = useState<Record<string, number>>(
        {},
    );
    const [isMouldingDialogOpen, setIsMouldingDialogOpen] = useState(false);

    const stepRoutingQuery = useNewSalesFormStepRoutingQuery({});
    const routeData = stepRoutingQuery.data;

    const activeLine =
        record?.lineItems?.find((line) => line.uid === editor.activeItem) ||
        record?.lineItems?.[0] ||
        null;
    const activeLineSteps = activeLine?.formSteps || [];
    const activeStepIndex =
        activeLine == null
            ? 0
            : (activeStepByLine[activeLine.uid] ?? Math.max(0, activeLineSteps.length - 1));
    const activeStep = activeLineSteps[activeStepIndex] || null;

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
            .filter((component) => isComponentVisibleByRules(component, selectedByStepUid))
            .map((component) => {
                const price = resolveComponentPriceByDeps(component, selectedByStepUid);
                return {
                    ...component,
                    salesPrice:
                        component?.salesPrice == null
                            ? price.salesPrice
                            : component.salesPrice,
                    basePrice:
                        component?.basePrice == null ? price.basePrice : component.basePrice,
                };
            });
    }, [stepComponentsQuery.data, activeLineSteps]);
    const activeRootComponents = useMemo(() => {
        const roots = rootComponentsQuery.data || [];
        const configured = new Set(Object.keys(routeData?.composedRouter || {}));
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
                const price = resolveComponentPriceByDeps(component, selectedByStepUid);
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
        const rootRoute = rootComponentUid ? routeData.composedRouter?.[rootComponentUid] : null;

        const currentStepUid =
            currentStep.step?.uid || routeData.stepsById?.[currentStep.stepId || -1];

        let nextStep: any =
            selectedComponent.redirectUid
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
    function mergeSeriesWithExisting(existingSteps: any[], configuredSteps: any[]) {
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
            const candidates = (routeStep?.components || []).filter((component: any) => !!component.uid);
            const hiddenAuto = AUTO_ADVANCE_TITLES.has(normalizeTitle(nextStep.title));

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
    }: {
        line: (typeof record.lineItems)[number];
        steps: any[];
        currentStepIndex: number;
        component: any;
    }) {
        const nextSteps = [...steps];
        const current = nextSteps[currentStepIndex];
        if (!current) return;
        const isMultiSelectStep = isMultiSelectStepTitle(current?.step?.title);

        if (isMultiSelectStep) {
            const selectedSet = new Set(getSelectedProdUids(current));
            if (selectedSet.has(component.uid)) selectedSet.delete(component.uid);
            else selectedSet.add(component.uid);

            const selectedUids = Array.from(selectedSet);
            const selectedComponents = selectedUids
                .map((uid) =>
                    visibleComponents.find((candidate: any) => candidate.uid === uid),
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
                        uid: c.uid,
                        title: c.title,
                        img: c.img || null,
                        salesPrice:
                            c.salesPrice == null ? null : Number(c.salesPrice || 0),
                        basePrice:
                            c.basePrice == null ? null : Number(c.basePrice || 0),
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

            const routed = applyRouteRecursion({
                line,
                steps: nextSteps,
                startIndex: currentStepIndex,
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
                routed.steps[currentStepIndex + 1] != null
                    ? currentStepIndex + 1
                    : currentStepIndex;
            setActiveStepByLine((prev) => ({
                ...prev,
                [line.uid]: nextIndex,
            }));
            return;
        }

        nextSteps[currentStepIndex] = {
            ...current,
            componentId: component.id,
            prodUid: component.uid,
            value: component.title,
            price: component.salesPrice == null ? current.price : Number(component.salesPrice || 0),
            basePrice:
                component.basePrice == null ? current.basePrice : Number(component.basePrice || 0),
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

        const selectedStepTitle = normalizeTitle(nextSteps[currentStepIndex]?.step?.title);
        const isItemTypeStep =
            currentStepIndex === 0 || selectedStepTitle === "item type";
        if (isItemTypeStep) {
            const rootUid =
                nextSteps[currentStepIndex]?.step?.uid ||
                routeData?.stepsById?.[nextSteps[currentStepIndex]?.stepId || -1] ||
                routeData?.rootStepUid;
            const rootStep = rootUid ? routeData?.stepsByUid?.[rootUid] : null;
            if (rootStep) {
                const configuredSeries = buildConfiguredRouteSteps(rootStep, component);
                const mergedSeries = mergeSeriesWithExisting(nextSteps, configuredSeries);
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

    function selectRootComponent(line: (typeof record.lineItems)[number], component: any) {
        const rootStep = routeData?.rootStepUid
            ? routeData?.stepsByUid?.[routeData.rootStepUid]
            : null;
        if (!rootStep) return;

        const routedSteps = buildConfiguredRouteSteps(rootStep, component);

        updateLineItem(line.uid, {
            formSteps: routedSteps,
            title:
                normalizeTitle(line.title).startsWith("new line") || !line.title?.trim()
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

    return (
        <>
            <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Item Workflow
                    </h3>
                    <div className="ml-auto flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                                setEditor({
                                    stepDisplayMode:
                                        editor.stepDisplayMode === "extended"
                                            ? "compact"
                                            : "extended",
                                })
                            }
                        >
                            {editor.stepDisplayMode === "extended"
                                ? "Compact Steps"
                                : "Extended Steps"}
                        </Button>
                        <Button size="sm" onClick={() => addLineItem()}>
                            Add Item
                        </Button>
                    </div>
                </div>

                <div className="space-y-3">
                    {record.lineItems.map((line, index) => {
                        const isActive = line.uid === activeLine?.uid;
                        const steps = line.formSteps || [];
                        const activeIndex =
                            activeStepByLine[line.uid] ?? Math.max(0, steps.length - 1);
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
                                        className="text-left md:col-span-6"
                                        onClick={() =>
                                            setEditor({
                                                activeItem: line.uid,
                                            })
                                        }
                                    >
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Item {index + 1}
                                        </p>
                                        <p className="mt-1 text-base font-semibold">
                                            {line.title || `Item ${index + 1}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {steps.length} step{steps.length === 1 ? "" : "s"} in flow
                                        </p>
                                    </button>
                                    <div className="md:col-span-4">
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
                                            onClick={() => removeLineItem(line.uid)}
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
                                                    setActiveStepByLine((prev) => ({
                                                        ...prev,
                                                        [line.uid]: si,
                                                    }))
                                                }
                                            >
                                                {step.step?.title || `Step ${si + 1}`}
                                                {step.value ? `: ${step.value}` : ""}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}

                                {isActive &&
                                resolveComponentImageSrc(activeItemStep?.meta?.img) ? (
                                    <div className="mt-3 overflow-hidden rounded-lg border bg-muted/30">
                                        <img
                                            src={
                                                resolveComponentImageSrc(
                                                    activeItemStep?.meta?.img,
                                                ) || ""
                                            }
                                            alt={
                                                activeItemStep.value ||
                                                activeItemStep.step?.title ||
                                                "Selected"
                                            }
                                            className="h-36 w-full object-contain p-2"
                                        />
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                {activeLine && !(activeLine.formSteps || []).length ? (
                    <div className="rounded-xl border bg-background p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Root Step Components
                        </p>
                        {stepRoutingQuery.isPending || rootComponentsQuery.isPending ? (
                            <p className="text-sm text-muted-foreground">Loading step routing...</p>
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
                                        onClick={() => selectRootComponent(activeLine, component)}
                                    >
                                        <div className="h-32 bg-muted">
                                            {resolveComponentImageSrc(component.img) ? (
                                                <img
                                                    src={resolveComponentImageSrc(component.img) || ""}
                                                    alt={component.title || component.uid}
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
                                                {component.title || component.uid}
                                            </p>
                                            <p className="text-xs font-medium text-primary">
                                                {moneyAny(
                                                    component.salesPrice ??
                                                        component.basePrice ??
                                                        component?.pricing?.[component.uid]
                                                            ?.price ??
                                                        null,
                                                ) || "No price"}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}

                {!activeLine || !activeStep ? null : (
                    <div className="rounded-xl border bg-background p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Select Component: {activeStep.step?.title || "Current Step"}
                            </p>
                            <div className="ml-auto flex items-center gap-2">
                                {isMouldingItem(activeLine) ? (
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

                        {isServiceItem(activeLine) &&
                        normalizeTitle(activeStep.step?.title).includes("line item") ? (
                            <div className="space-y-3 rounded-lg border p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Service Line Item
                                </p>
                                <div className="grid gap-3 md:grid-cols-12">
                                    <div className="md:col-span-6">
                                        <Input
                                            value={activeLine.title || ""}
                                            onChange={(e) =>
                                                updateLineItem(activeLine.uid, {
                                                    title: e.target.value,
                                                })
                                            }
                                            placeholder="Service title"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Input
                                            type="number"
                                            value={activeLine.qty || 0}
                                            onChange={(e) =>
                                                updateLineItem(activeLine.uid, {
                                                    qty: Number(e.target.value || 0),
                                                })
                                            }
                                            placeholder="Qty"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeLine.unitPrice || 0}
                                            onChange={(e) =>
                                                updateLineItem(activeLine.uid, {
                                                    unitPrice: Number(e.target.value || 0),
                                                })
                                            }
                                            placeholder="Unit"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Input
                                            value={money(activeLine.lineTotal) || "$0.00"}
                                            readOnly
                                        />
                                    </div>
                                </div>
                                <Input
                                    value={activeLine.description || ""}
                                    onChange={(e) =>
                                        updateLineItem(activeLine.uid, {
                                            description: e.target.value,
                                        })
                                    }
                                    placeholder="Service description"
                                />
                            </div>
                        ) : isShelfItem(activeLine) &&
                          normalizeTitle(activeStep.step?.title).includes("shelf") ? (
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
                                            updateLineItem(activeLine.uid, {
                                                shelfItems: [
                                                    ...(activeLine.shelfItems || []),
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
                                {(activeLine.shelfItems || []).length ? (
                                    <div className="space-y-2">
                                        {(activeLine.shelfItems || []).map((row, idx) => (
                                            <div
                                                key={`shelf-row-${idx}`}
                                                className="grid gap-2 md:grid-cols-12"
                                            >
                                                <Input
                                                    className="md:col-span-5"
                                                    value={row.description || ""}
                                                    onChange={(e) =>
                                                        updateLineItem(activeLine.uid, {
                                                            shelfItems: (
                                                                activeLine.shelfItems || []
                                                            ).map((item, i) =>
                                                                i === idx
                                                                    ? {
                                                                          ...item,
                                                                          description:
                                                                              e.target.value,
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
                                                        updateLineItem(activeLine.uid, {
                                                            shelfItems: (
                                                                activeLine.shelfItems || []
                                                            ).map((item, i) => {
                                                                if (i !== idx) return item;
                                                                const qty = Number(
                                                                    e.target.value || 0,
                                                                );
                                                                return {
                                                                    ...item,
                                                                    qty,
                                                                    totalPrice:
                                                                        qty *
                                                                        Number(
                                                                            item.unitPrice || 0,
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
                                                        updateLineItem(activeLine.uid, {
                                                            shelfItems: (
                                                                activeLine.shelfItems || []
                                                            ).map((item, i) => {
                                                                if (i !== idx) return item;
                                                                const unitPrice = Number(
                                                                    e.target.value || 0,
                                                                );
                                                                return {
                                                                    ...item,
                                                                    unitPrice,
                                                                    totalPrice:
                                                                        Number(item.qty || 0) *
                                                                        unitPrice,
                                                                };
                                                            }),
                                                        })
                                                    }
                                                    placeholder="Unit"
                                                />
                                                <Input
                                                    className="md:col-span-2"
                                                    value={money(row.totalPrice) || "$0.00"}
                                                    readOnly
                                                />
                                                <Button
                                                    className="md:col-span-1"
                                                    variant="destructive"
                                                    onClick={() =>
                                                        updateLineItem(activeLine.uid, {
                                                            shelfItems: (
                                                                activeLine.shelfItems || []
                                                            ).filter((_, i) => i !== idx),
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
                        ) : !activeStep.stepId && !activeStep.step?.id ? (
                            <p className="text-sm text-muted-foreground">
                                Step is missing ID and cannot load components yet.
                            </p>
                        ) : stepComponentsQuery.isPending ? (
                            <p className="text-sm text-muted-foreground">Loading components...</p>
                        ) : !visibleComponents.length ? (
                            <p className="text-sm text-muted-foreground">
                                No components returned for this step.
                            </p>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {visibleComponents.map((component) => {
                                    const selectedUids = new Set(getSelectedProdUids(activeStep));
                                    const isSelected = selectedUids.has(component.uid);
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
                                                saveSelectedComponent({
                                                    line: activeLine,
                                                    steps: activeLineSteps,
                                                    currentStepIndex: activeStepIndex,
                                                    component,
                                                })
                                            }
                                        >
                                            <div className="h-32 bg-muted">
                                                {resolveComponentImageSrc(component.img) ? (
                                                    <img
                                                        src={
                                                            resolveComponentImageSrc(component.img) || ""
                                                        }
                                                        alt={component.title || component.uid}
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
                                                    {component.title}
                                                </p>
                                                <p className="text-xs font-medium text-primary">
                                                    {moneyAny(
                                                        component.salesPrice ??
                                                            component.basePrice ??
                                                            component?.pricing?.[component.uid]
                                                                ?.price ??
                                                            null,
                                                    ) || "No price"}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </section>

            {activeLine ? (
                <MouldingCalculatorDialog
                    open={isMouldingDialogOpen}
                    onOpenChange={setIsMouldingDialogOpen}
                    line={activeLine}
                    onApply={(linePatch) => updateLineItem(activeLine.uid, linePatch)}
                />
            ) : null}
        </>
    );
}
