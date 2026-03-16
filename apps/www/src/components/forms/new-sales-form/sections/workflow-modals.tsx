"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { Input } from "@gnd/ui/input";
import { Checkbox } from "@gnd/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { Calculator, CheckCircle2, Trash2, X } from "lucide-react";
import type { NewSalesFormLineItem } from "../schema";
import {
    deriveDoorSizeCandidates,
    hasDoorSizeVariationConfig,
    normalizeSalesFormTitle,
    resolveDoorTierPricing,
} from "@gnd/sales/sales-form";
import { widthList } from "@/app-deps/(clean-code)/(sales)/_common/utils/contants";
import { ftToIn } from "@/lib/utils";

type DoorLine = NonNullable<
    NonNullable<NewSalesFormLineItem["housePackageTool"]>["doors"]
>[number];

function toNumber(value: unknown, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function firstFiniteNumber(...values: Array<number | null | undefined>) {
    for (const value of values) {
        const candidate = Number(value);
        if (Number.isFinite(candidate)) return candidate;
    }
    return null;
}

function currency(value?: number | null) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(Number(value || 0));
}

export function profileAdjustedDoorSalesPrice(
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

function calcDoorRow(row: DoorLine): DoorLine {
    const lhQty = toNumber(row.lhQty, 0);
    const rhQty = toNumber(row.rhQty, 0);
    const totalInput = toNumber(row.totalQty, 0);
    const unitPrice = toNumber(row.unitPrice, 0);
    const totalQty = lhQty + rhQty > 0 ? lhQty + rhQty : totalInput;
    return {
        ...row,
        lhQty,
        rhQty,
        unitPrice,
        totalQty,
        lineTotal: Number((totalQty * unitPrice).toFixed(2)),
    };
}

function blankDoorRow(): DoorLine {
    return {
        id: null,
        dimension: "",
        swing: "",
        doorType: "",
        doorPrice: 0,
        jambSizePrice: 0,
        casingPrice: 0,
        unitPrice: 0,
        lhQty: 0,
        rhQty: 0,
        totalQty: 0,
        lineTotal: 0,
        stepProductId: null,
        meta: {},
    };
}

interface DoorDetailsDialogProps {
    open: boolean;
    onOpenChange: (next: boolean) => void;
    line: NewSalesFormLineItem;
    onApply: (linePatch: Partial<NewSalesFormLineItem>) => void;
}

export function DoorDetailsDialog(props: DoorDetailsDialogProps) {
    const [rows, setRows] = useState<DoorLine[]>(
        (props.line.housePackageTool?.doors || []).map(calcDoorRow),
    );

    const totals = useMemo(() => {
        const normalized = rows.map(calcDoorRow);
        const totalDoors = normalized.reduce((sum, row) => sum + toNumber(row.totalQty), 0);
        const totalPrice = normalized.reduce(
            (sum, row) => sum + toNumber(row.lineTotal),
            0,
        );
        return {
            totalDoors,
            totalPrice: Number(totalPrice.toFixed(2)),
            normalized,
        };
    }, [rows]);

    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent className="max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Door Details</DialogTitle>
                    <DialogDescription>
                        Configure door sizes, swings, quantities, and pricing.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] space-y-3 overflow-auto rounded-lg border p-3">
                    <div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <p className="col-span-3">Dimension</p>
                        <p className="col-span-2">Swing</p>
                        <p className="col-span-2">LH Qty</p>
                        <p className="col-span-2">RH Qty</p>
                        <p className="col-span-2">Unit Price</p>
                        <p className="col-span-1">Remove</p>
                    </div>
                    {rows.map((row, index) => (
                        <div key={`door-row-${index}`} className="grid grid-cols-12 gap-2">
                            <Input
                                className="col-span-3"
                                value={row.dimension || ""}
                                onChange={(e) =>
                                    setRows((prev) =>
                                        prev.map((item, ri) =>
                                            ri === index
                                                ? {
                                                      ...item,
                                                      dimension: e.target.value,
                                                  }
                                                : item,
                                        ),
                                    )
                                }
                                placeholder="2-8 x 8-0"
                            />
                            <Input
                                className="col-span-2"
                                value={row.swing || ""}
                                onChange={(e) =>
                                    setRows((prev) =>
                                        prev.map((item, ri) =>
                                            ri === index
                                                ? {
                                                      ...item,
                                                      swing: e.target.value,
                                                  }
                                                : item,
                                        ),
                                    )
                                }
                                placeholder="LH/RH"
                            />
                            <Input
                                className="col-span-2"
                                type="number"
                                value={row.lhQty || 0}
                                onChange={(e) =>
                                    setRows((prev) =>
                                        prev.map((item, ri) =>
                                            ri === index
                                                ? calcDoorRow({
                                                      ...item,
                                                      lhQty: toNumber(e.target.value),
                                                  })
                                                : item,
                                        ),
                                    )
                                }
                            />
                            <Input
                                className="col-span-2"
                                type="number"
                                value={row.rhQty || 0}
                                onChange={(e) =>
                                    setRows((prev) =>
                                        prev.map((item, ri) =>
                                            ri === index
                                                ? calcDoorRow({
                                                      ...item,
                                                      rhQty: toNumber(e.target.value),
                                                  })
                                                : item,
                                        ),
                                    )
                                }
                            />
                            <Input
                                className="col-span-2"
                                type="number"
                                step="0.01"
                                value={row.unitPrice || 0}
                                onChange={(e) =>
                                    setRows((prev) =>
                                        prev.map((item, ri) =>
                                            ri === index
                                                ? calcDoorRow({
                                                      ...item,
                                                      unitPrice: toNumber(e.target.value),
                                                  })
                                                : item,
                                        ),
                                    )
                                }
                            />
                            <Button
                                className="col-span-1"
                                variant="destructive"
                                onClick={() =>
                                    setRows((prev) => prev.filter((_, ri) => ri !== index))
                                }
                            >
                                X
                            </Button>
                            <p className="col-span-12 text-right text-xs text-muted-foreground">
                                Qty: {toNumber(calcDoorRow(row).totalQty)} | Line Total: ${" "}
                                {toNumber(calcDoorRow(row).lineTotal).toFixed(2)}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRows((prev) => [...prev, blankDoorRow()])}
                    >
                        Add Door Row
                    </Button>
                    <p className="ml-auto">
                        Total Doors: <span className="font-semibold">{totals.totalDoors}</span>
                    </p>
                    <p>
                        Total: <span className="font-semibold">${totals.totalPrice.toFixed(2)}</span>
                    </p>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => props.onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            props.onApply({
                                housePackageTool: {
                                    ...(props.line.housePackageTool || {
                                        id: null,
                                    }),
                                    doors: totals.normalized,
                                    totalDoors: totals.totalDoors,
                                    totalPrice: totals.totalPrice,
                                } as any,
                                qty: totals.totalDoors || props.line.qty,
                                lineTotal: totals.totalPrice || props.line.lineTotal,
                            } as any);
                            props.onOpenChange(false);
                        }}
                    >
                        Apply Door Details
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface DoorSizeQtyDialogProps {
    open: boolean;
    onOpenChange: (next: boolean) => void;
    line: NewSalesFormLineItem;
    routeData?: any;
    component: {
        id: number | null;
        uid: string;
        title?: string | null;
        salesPrice?: number | null;
        basePrice?: number | null;
        pricing?: Record<string, { id?: number; price?: number | null }>;
    } | null;
    supplierUid?: string | null;
    supplierName?: string | null;
    suppliers?: Array<{
        uid: string;
        name: string;
    }>;
    onSupplierChange?: (supplierUid: string | null) => void;
    profileCoefficient?: number | null;
    routeConfig?: {
        noHandle?: boolean;
        hasSwing?: boolean;
    } | null;
    onRemoveSelection?: () => void;
    onNextStep?: () => void;
    onApply: (payload: { rows: DoorLine[]; selected: boolean }) => void;
}

export function formatDoorSizeTitle(size?: string | null) {
    const [width, height] = String(size || "").split(" x ");
    const widthIn = width ? ftToIn(width.trim())?.replace("in", '"') : "";
    const heightIn = height ? ftToIn(height.trim())?.replace("in", '"') : "";
    if (!widthIn || !heightIn) return String(size || "--");
    return `${widthIn} x ${heightIn}`;
}

function rowsForComponent(line: NewSalesFormLineItem, componentId: number | null) {
    const rows = (line.housePackageTool?.doors || [])
        .filter((door) => Number(door.stepProductId || 0) === Number(componentId || 0))
        .map(calcDoorRow);
    return rows;
}
function deriveDoorSizeRows(
    line: NewSalesFormLineItem,
    existingRows: DoorLine[],
    component: DoorSizeQtyDialogProps["component"],
    routeData?: any,
    supplierUid?: string | null,
    profileCoefficient?: number | null,
) {
    const bySize = new Map<string, DoorLine>();
    existingRows.forEach((row) => {
        if (row.dimension) bySize.set(String(row.dimension).trim(), row);
    });
    const pricing = component?.pricing || {};
    const usesVariantFiltering = hasDoorSizeVariationConfig(line, routeData);
    const candidateSizes = deriveDoorSizeCandidates(line, pricing, routeData);
    if (!candidateSizes.length) {
        if (existingRows.length && !usesVariantFiltering) return existingRows;
        if (usesVariantFiltering) return [];
        const fallbackBase =
            firstFiniteNumber(component?.basePrice, component?.salesPrice) ?? 0;
        return [
            calcDoorRow({
                ...blankDoorRow(),
                stepProductId: component?.id || null,
                unitPrice: profileAdjustedDoorSalesPrice(
                    component?.salesPrice,
                    component?.basePrice,
                    profileCoefficient,
                ),
                meta: {
                    baseUnitPrice: fallbackBase,
                },
            }),
        ];
    }

    return candidateSizes.map((size) => {
        const normalizedSize = String(size).trim();
        const existing = bySize.get(normalizedSize);
        const pricingPair = resolveDoorTierPricing({
            pricing,
            size: normalizedSize,
            supplierUid,
            salesMultiplier:
                Number.isFinite(Number(profileCoefficient || 0)) &&
                Number(profileCoefficient || 0) > 0
                    ? Number((1 / Number(profileCoefficient || 0)).toFixed(2))
                    : 1,
            fallbackSalesPrice: component?.salesPrice,
            fallbackBasePrice: component?.basePrice,
        });
        const hasResolvedPrice = Boolean(pricingPair.hasPrice);
        const rowBaseUnit = firstFiniteNumber(
            hasResolvedPrice ? pricingPair.basePrice : null,
            hasResolvedPrice ? component?.basePrice : null,
            hasResolvedPrice ? component?.salesPrice : null,
        );
        const unitPrice =
            hasResolvedPrice
                ? (firstFiniteNumber(
                      profileAdjustedDoorSalesPrice(
                          pricingPair.salesPrice,
                          pricingPair.basePrice,
                          profileCoefficient,
                      ),
                      component?.salesPrice,
                      component?.basePrice,
                  ) ?? 0)
                : 0;
        return calcDoorRow({
            ...(existing || blankDoorRow()),
            dimension: normalizedSize,
            stepProductId: component?.id || existing?.stepProductId || null,
            unitPrice,
            meta: {
                ...((existing as any)?.meta || {}),
                priceMissing: !hasResolvedPrice,
                baseUnitPrice: rowBaseUnit ?? 0,
            },
        });
    });
}

export function updateDoorRowBasePrice(
    row: DoorLine,
    nextBase: number,
    profileCoefficient?: number | null,
) {
    const normalizedNextBase = Math.max(0, nextBase);
    const priorBase = toNumber(
        (row.meta as any)?.baseUnitPrice,
        toNumber(row.unitPrice, 0),
    );
    const priorCalculatedSales = profileAdjustedDoorSalesPrice(
        null,
        priorBase,
        profileCoefficient,
    );
    const surcharge = Number(
        (toNumber(row.unitPrice, 0) - priorCalculatedSales).toFixed(2),
    );
    const nextCalculatedSales = profileAdjustedDoorSalesPrice(
        null,
        normalizedNextBase,
        profileCoefficient,
    );
    return calcDoorRow({
        ...row,
        unitPrice: Number((nextCalculatedSales + surcharge).toFixed(2)),
        meta: {
            ...(row.meta || {}),
            baseUnitPrice: normalizedNextBase,
            priceMissing: false,
        },
    });
}

export function DoorPriceCell({
    row,
    onSave,
    profileCoefficient,
}: {
    row: DoorLine | any;
    onSave: (nextBase: number) => void;
    profileCoefficient?: number | null;
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const baseUnit =
        firstFiniteNumber((row.meta as any)?.baseUnitPrice, row.unitPrice) ?? 0;
    const isMissingPrice = Boolean((row.meta as any)?.priceMissing);
    const doorSalesPrice = profileAdjustedDoorSalesPrice(
        null,
        baseUnit,
        profileCoefficient,
    );

    useEffect(() => {
        setDraft(isMissingPrice || !baseUnit ? "" : String(baseUnit));
    }, [baseUnit, isMissingPrice, open]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant={
                        isMissingPrice
                            ? "destructive"
                            : row.unitPrice > 0
                              ? "outline"
                              : "secondary"
                    }
                    className="h-10 w-full min-w-[116px] flex-col items-start gap-0 rounded-xl border-slate-300 px-3 py-2 text-left"
                >
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        {isMissingPrice ? "Missing" : "Price"}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                        {isMissingPrice ? "Add Price" : currency(row.unitPrice)}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3 p-4">
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                        {isMissingPrice ? "Add Base Price" : "Edit Base Price"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Final price keeps the current surcharge delta and updates from this base.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`door-base-${row.dimension || "row"}`}>
                        Base Price
                    </Label>
                    <Input
                        id={`door-base-${row.dimension || "row"}`}
                        type="number"
                        step="0.01"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                    />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Door sales price</span>
                    <span className="font-semibold text-foreground">
                        {currency(doorSalesPrice)}
                    </span>
                </div>
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                            const nextBase = toNumber(draft, Number.NaN);
                            if (!Number.isFinite(nextBase) || nextBase < 0) return;
                            onSave(nextBase);
                            setOpen(false);
                        }}
                    >
                        Save
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

type DoorSizeVariantRule = {
    stepUid: string | null;
    operator: "is" | "isNot";
    componentsUid: string[];
};

type DoorSizeVariantGroup = {
    rules: DoorSizeVariantRule[];
    widthList: string[];
};

function normalizeDoorSizeVariantGroups(value: any): DoorSizeVariantGroup[] {
    if (!Array.isArray(value)) return [];
    return value.map((group: any) => ({
        rules: Array.isArray(group?.rules) && group.rules.length
            ? group.rules.map((rule: any) => ({
                  stepUid: rule?.stepUid ? String(rule.stepUid) : null,
                  operator:
                      String(rule?.operator || "is") === "isNot"
                          ? "isNot"
                          : "is",
                  componentsUid: Array.isArray(rule?.componentsUid)
                      ? rule.componentsUid
                            .map((entry: any) => String(entry || "").trim())
                            .filter(Boolean)
                      : [],
              }))
            : [{ stepUid: null, operator: "is", componentsUid: [] }],
        widthList: Array.isArray(group?.widthList)
            ? group.widthList
                  .map((entry: any) => String(entry || "").trim())
                  .filter(Boolean)
            : [],
    }));
}

function blankDoorSizeVariantGroup(): DoorSizeVariantGroup {
    return {
        rules: [{ stepUid: null, operator: "is", componentsUid: [] }],
        widthList: [],
    };
}

interface DoorSizeVariantDialogProps {
    open: boolean;
    onOpenChange: (next: boolean) => void;
    routeData: any;
    steps: any[];
    initialVariations?: any;
    onSave: (variations: DoorSizeVariantGroup[]) => void | Promise<void>;
}

export function DoorSizeVariantDialog(props: DoorSizeVariantDialogProps) {
    const [groups, setGroups] = useState<DoorSizeVariantGroup[]>(
        normalizeDoorSizeVariantGroups(props.initialVariations),
    );

    useEffect(() => {
        if (!props.open) return;
        setGroups(normalizeDoorSizeVariantGroups(props.initialVariations));
    }, [props.initialVariations, props.open]);

    const availableSteps = useMemo(() => {
        const lineScopedSteps = (props.steps || [])
            .map((step: any) => {
                const uid = String(step?.step?.uid || "").trim();
                if (!uid) return null;
                const routeStep = props.routeData?.stepsByUid?.[uid] || null;
                return routeStep || step?.step || null;
            })
            .filter(Boolean);
        const configuredSteps = lineScopedSteps.length
            ? lineScopedSteps
            : Array.isArray(props.routeData?.steps)
              ? props.routeData.steps
            : Object.keys(props.routeData?.stepsById || {})
                  .map((id) => Number(id))
                  .filter((id) => Number.isFinite(id))
                  .sort((a, b) => a - b)
                  .map((id) => {
                      const uid = props.routeData?.stepsById?.[id];
                      return uid ? props.routeData?.stepsByUid?.[uid] : null;
                  });
        return configuredSteps
            .filter(Boolean)
            .filter((step: any) => normalizeSalesFormTitle(step?.title) !== "door")
            .map((step: any) => ({
                uid: String(step?.uid || ""),
                title: String(step?.title || "").trim(),
                components: Array.isArray(step?.components) ? step.components : [],
            }))
            .filter((step: any) => step.uid && step.title);
    }, [props.routeData, props.steps]);

    const availableStepMap = useMemo(
        () => new Map(availableSteps.map((step: any) => [step.uid, step])),
        [availableSteps],
    );

    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent className="max-w-5xl overflow-hidden p-0">
                <div className="bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_45%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]">
                    <DialogHeader className="border-b border-slate-200 px-6 py-5">
                        <DialogTitle>Door Size Variant</DialogTitle>
                        <DialogDescription>
                            Control which widths are available for each door-height path.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
                        {!groups.length ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500">
                                No variant rules yet. Add a group to define which widths
                                should appear for matching step selections.
                            </div>
                        ) : (
                            groups.map((group, groupIndex) => (
                                <section
                                    key={`door-size-variant-group-${groupIndex}`}
                                    className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                Variant Group {groupIndex + 1}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                All rules in this group must match before its widths are added.
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="ml-auto text-red-600"
                                            onClick={() =>
                                                setGroups((prev) =>
                                                    prev.filter((_, index) => index !== groupIndex),
                                                )
                                            }
                                        >
                                            <Trash2 className="mr-2 size-4" />
                                            Remove
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {group.rules.map((rule, ruleIndex) => {
                                            const usedStepUids = new Set(
                                                group.rules
                                                    .map((entry, index) =>
                                                        index === ruleIndex
                                                            ? null
                                                            : String(
                                                                  entry?.stepUid || "",
                                                              ).trim(),
                                                    )
                                                    .filter(Boolean),
                                            );
                                            const selectableSteps =
                                                availableSteps.filter(
                                                    (step: any) =>
                                                        !usedStepUids.has(
                                                            String(
                                                                step?.uid || "",
                                                            ),
                                                        ) ||
                                                        String(
                                                            rule.stepUid || "",
                                                        ) ===
                                                            String(
                                                                step?.uid || "",
                                                            ),
                                                );
                                            const stepOptions =
                                                availableStepMap.get(
                                                    String(rule.stepUid || ""),
                                                )?.components || [];
                                            const selectedComponents = new Set(
                                                rule.componentsUid || [],
                                            );
                                            return (
                                                <div
                                                    key={`door-size-variant-rule-${groupIndex}-${ruleIndex}`}
                                                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                                                >
                                                    <div className="grid gap-3 md:grid-cols-[1.3fr_120px_2fr_auto]">
                                                        <div className="space-y-2">
                                                            <Label>Step</Label>
                                                            <select
                                                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                                                value={rule.stepUid || ""}
                                                                onChange={(e) =>
                                                                    setGroups((prev) =>
                                                                        prev.map((entry, index) =>
                                                                            index === groupIndex
                                                                                ? {
                                                                                      ...entry,
                                                                                      rules: entry.rules.map(
                                                                                          (innerRule, innerIndex) =>
                                                                                              innerIndex ===
                                                                                              ruleIndex
                                                                                                  ? {
                                                                                                        ...innerRule,
                                                                                                        stepUid:
                                                                                                            e.target.value ||
                                                                                                            null,
                                                                                                        componentsUid:
                                                                                                            [],
                                                                                                    }
                                                                                                  : innerRule,
                                                                                      ),
                                                                                  }
                                                                                : entry,
                                                                        ),
                                                                    )
                                                                }
                                                            >
                                                                <option value="">Select step</option>
                                                                {selectableSteps.map((step: any) => (
                                                                    <option
                                                                        key={`variant-step-${step.uid}`}
                                                                        value={step.uid}
                                                                    >
                                                                        {step.title}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Operator</Label>
                                                            <select
                                                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                                                value={rule.operator}
                                                                onChange={(e) =>
                                                                    setGroups((prev) =>
                                                                        prev.map((entry, index) =>
                                                                            index === groupIndex
                                                                                ? {
                                                                                      ...entry,
                                                                                      rules: entry.rules.map(
                                                                                          (innerRule, innerIndex) =>
                                                                                              innerIndex ===
                                                                                              ruleIndex
                                                                                                  ? {
                                                                                                        ...innerRule,
                                                                                                        operator:
                                                                                                            e.target.value ===
                                                                                                            "isNot"
                                                                                                                ? "isNot"
                                                                                                                : "is",
                                                                                                    }
                                                                                                  : innerRule,
                                                                                      ),
                                                                                  }
                                                                                : entry,
                                                                        ),
                                                                    )
                                                                }
                                                            >
                                                                <option value="is">is</option>
                                                                <option value="isNot">is not</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Components</Label>
                                                            <div className="grid max-h-32 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 sm:grid-cols-2">
                                                                {stepOptions.length ? (
                                                                    stepOptions.map((component: any) => {
                                                                        const uid = String(
                                                                            component?.uid || "",
                                                                        );
                                                                        if (!uid) return null;
                                                                        const checked =
                                                                            selectedComponents.has(uid);
                                                                        return (
                                                                            <label
                                                                                key={`variant-component-${groupIndex}-${ruleIndex}-${uid}`}
                                                                                className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                                                                            >
                                                                                <Checkbox
                                                                                    checked={checked}
                                                                                    onCheckedChange={(next) =>
                                                                                        setGroups((prev) =>
                                                                                            prev.map((entry, index) =>
                                                                                                index ===
                                                                                                groupIndex
                                                                                                    ? {
                                                                                                          ...entry,
                                                                                                          rules: entry.rules.map(
                                                                                                              (
                                                                                                                  innerRule,
                                                                                                                  innerIndex,
                                                                                                              ) =>
                                                                                                                  innerIndex ===
                                                                                                                  ruleIndex
                                                                                                                      ? {
                                                                                                                            ...innerRule,
                                                                                                                            componentsUid:
                                                                                                                                next
                                                                                                                                    ? Array.from(
                                                                                                                                          new Set([
                                                                                                                                              ...innerRule.componentsUid,
                                                                                                                                              uid,
                                                                                                                                          ]),
                                                                                                                                      )
                                                                                                                                    : innerRule.componentsUid.filter(
                                                                                                                                          (
                                                                                                                                              value,
                                                                                                                                          ) =>
                                                                                                                                              value !==
                                                                                                                                              uid,
                                                                                                                                      ),
                                                                                                                        }
                                                                                                                      : innerRule,
                                                                                                          ),
                                                                                                      }
                                                                                                    : entry,
                                                                                            ),
                                                                                        )
                                                                                    }
                                                                                />
                                                                                <span>
                                                                                    {component?.title || uid}
                                                                                </span>
                                                                            </label>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <p className="col-span-full text-xs text-slate-500">
                                                                        Pick a step first to load components.
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-end">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-red-600"
                                                                onClick={() =>
                                                                    setGroups((prev) =>
                                                                        prev.map((entry, index) =>
                                                                            index === groupIndex
                                                                                ? {
                                                                                      ...entry,
                                                                                      rules:
                                                                                          entry.rules.length >
                                                                                          1
                                                                                              ? entry.rules.filter(
                                                                                                    (
                                                                                                        _,
                                                                                                        innerIndex,
                                                                                                    ) =>
                                                                                                        innerIndex !==
                                                                                                        ruleIndex,
                                                                                                )
                                                                                              : entry.rules,
                                                                                  }
                                                                                : entry,
                                                                        ),
                                                                    )
                                                                }
                                                                disabled={group.rules.length <= 1}
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={
                                                group.rules.filter((rule) =>
                                                    String(
                                                        rule?.stepUid || "",
                                                    ).trim(),
                                                ).length >= availableSteps.length
                                            }
                                            onClick={() =>
                                                setGroups((prev) =>
                                                    prev.map((entry, index) =>
                                                        index === groupIndex
                                                            ? {
                                                                  ...entry,
                                                                  rules: [
                                                                      ...entry.rules,
                                                                      {
                                                                          stepUid: null,
                                                                          operator: "is",
                                                                          componentsUid: [],
                                                                      },
                                                                  ],
                                                              }
                                                            : entry,
                                                    ),
                                                )
                                            }
                                        >
                                            Add Filter
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <Label>Widths</Label>
                                            <span className="text-xs text-slate-500">
                                                {group.widthList.length} selected
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                                            {widthList.map((width) => {
                                                const selected = group.widthList.includes(width);
                                                return (
                                                    <button
                                                        key={`variant-width-${groupIndex}-${width}`}
                                                        type="button"
                                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                                            selected
                                                                ? "border-primary bg-primary/10 text-primary"
                                                                : "border-slate-300 bg-white text-slate-600 hover:border-primary"
                                                        }`}
                                                        onClick={() =>
                                                            setGroups((prev) =>
                                                                prev.map((entry, index) =>
                                                                    index === groupIndex
                                                                        ? {
                                                                              ...entry,
                                                                              widthList: selected
                                                                                  ? entry.widthList.filter(
                                                                                        (
                                                                                            value,
                                                                                        ) =>
                                                                                            value !==
                                                                                            width,
                                                                                    )
                                                                                  : [
                                                                                        ...entry.widthList,
                                                                                        width,
                                                                                    ].sort(
                                                                                        (
                                                                                            a,
                                                                                            b,
                                                                                        ) =>
                                                                                            widthList.indexOf(
                                                                                                a,
                                                                                            ) -
                                                                                            widthList.indexOf(
                                                                                                b,
                                                                                            ),
                                                                                    ),
                                                                          }
                                                                        : entry,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        {width}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </section>
                            ))
                        )}
                    </div>
                    <DialogFooter className="border-t border-slate-200 px-6 py-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                setGroups((prev) => [...prev, blankDoorSizeVariantGroup()])
                            }
                        >
                            Add Group
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => props.onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={async () => {
                                await props.onSave(
                                    normalizeDoorSizeVariantGroups(groups),
                                );
                                props.onOpenChange(false);
                            }}
                        >
                            Save Variants
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function DoorSizeQtyDialog(props: DoorSizeQtyDialogProps) {
    const [rows, setRows] = useState<DoorLine[]>([]);

    useEffect(() => {
        if (!props.open || !props.component) return;
        const existing = rowsForComponent(props.line, props.component.id);
        const nextRows = deriveDoorSizeRows(
            props.line,
            existing,
            props.component,
            props.routeData,
            props.supplierUid,
            props.profileCoefficient,
        );
        setRows(nextRows);
    }, [
        props.open,
        props.component,
        props.line,
        props.profileCoefficient,
        props.supplierUid,
    ]);

    const totals = useMemo(() => {
        const normalized = rows.map((row) =>
            calcDoorRow({
                ...row,
                stepProductId: props.component?.id || row.stepProductId || null,
            }),
        );
        const totalDoors = normalized.reduce((sum, row) => sum + toNumber(row.totalQty), 0);
        const totalPrice = normalized.reduce((sum, row) => sum + toNumber(row.lineTotal), 0);
        return {
            normalized,
            totalDoors,
            totalPrice: Number(totalPrice.toFixed(2)),
        };
    }, [rows, props.component]);

    if (!props.component) return null;

    function persistSelection(nextRows = totals.normalized, selected = true) {
        const persistedRows = nextRows.filter(
            (row) => selected && Number(row.totalQty || 0) > 0,
        );
        props.onApply({
            rows: persistedRows,
            selected: selected && persistedRows.length > 0,
        });
    }

    function qtyInputValue(value?: number | null) {
        return Number(value || 0) > 0 ? String(Number(value || 0)) : "";
    }

    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent className="max-w-[720px] gap-0 overflow-hidden p-0 sm:max-w-[760px]">
                <DialogHeader className="border-b bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-5">
                    <DialogTitle>{props.component.title || "Door"} Size Select</DialogTitle>
                    <DialogDescription>
                        Select size, price, and quantity for this door option.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 rounded-xl border bg-slate-50/70 p-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                Door Supplier
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                                {props.supplierName || "GND MILLWORK"}
                            </p>
                        </div>
                        <div className="w-full sm:w-[260px]">
                            <Select
                                value={props.supplierUid || "default"}
                                onValueChange={(value) =>
                                    props.onSupplierChange?.(
                                        value === "default" ? null : value,
                                    )
                                }
                            >
                                <SelectTrigger className="h-10 rounded-xl bg-white text-sm font-medium">
                                    <SelectValue placeholder="Select supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">
                                        GND MILLWORK (Default)
                                    </SelectItem>
                                    {(props.suppliers || []).map((supplier) => (
                                        <SelectItem
                                            key={supplier.uid}
                                            value={supplier.uid}
                                        >
                                            {supplier.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="md:hidden space-y-3">
                        {rows.map((row, index) => (
                            <div
                                key={`door-size-card-${index}`}
                                className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                            Size
                                        </p>
                                        <p className="text-sm font-semibold text-foreground">
                                            {formatDoorSizeTitle(row.dimension)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {row.dimension || "--"}
                                        </p>
                                    </div>
                                    <div className="min-w-[120px]">
                                        <DoorPriceCell
                                            row={row}
                                            profileCoefficient={
                                                props.profileCoefficient
                                            }
                                            onSave={(nextBase) =>
                                                setRows((prev) =>
                                                    prev.map((item, ri) =>
                                                        ri === index
                                                            ? updateDoorRowBasePrice(
                                                                  item,
                                                                  nextBase,
                                                                  props.profileCoefficient,
                                                              )
                                                            : item,
                                                    ),
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                                {props.routeConfig?.hasSwing ? (
                                    <div className="space-y-2">
                                        <Label>Swing</Label>
                                        <Input
                                            value={row.swing || ""}
                                            onChange={(e) =>
                                                setRows((prev) =>
                                                    prev.map((item, ri) =>
                                                        ri === index
                                                            ? {
                                                                  ...item,
                                                                  swing: e.target.value,
                                                              }
                                                            : item,
                                                    ),
                                                )
                                            }
                                            placeholder="LH/RH"
                                        />
                                    </div>
                                ) : null}
                                {props.routeConfig?.noHandle ? (
                                    <div className="space-y-2">
                                        <Label>Qty</Label>
                                        <Input
                                            type="number"
                                            value={qtyInputValue(row.totalQty)}
                                            onChange={(e) =>
                                                setRows((prev) =>
                                                    prev.map((item, ri) =>
                                                        ri === index
                                                            ? calcDoorRow({
                                                                  ...item,
                                                                  totalQty: toNumber(
                                                                      e.target.value,
                                                                      0,
                                                                  ),
                                                                  lhQty: 0,
                                                                  rhQty: 0,
                                                              })
                                                            : item,
                                                    ),
                                                )
                                            }
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>LH</Label>
                                            <Input
                                                type="number"
                                                value={qtyInputValue(row.lhQty)}
                                                onChange={(e) =>
                                                    setRows((prev) =>
                                                        prev.map((item, ri) =>
                                                            ri === index
                                                                ? calcDoorRow({
                                                                      ...item,
                                                                      lhQty: toNumber(
                                                                          e.target.value,
                                                                          0,
                                                                      ),
                                                                  })
                                                                : item,
                                                        ),
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>RH</Label>
                                            <Input
                                                type="number"
                                                value={qtyInputValue(row.rhQty)}
                                                onChange={(e) =>
                                                    setRows((prev) =>
                                                        prev.map((item, ri) =>
                                                            ri === index
                                                                ? calcDoorRow({
                                                                      ...item,
                                                                      rhQty: toNumber(
                                                                          e.target.value,
                                                                          0,
                                                                      ),
                                                                  })
                                                                : item,
                                                        ),
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="hidden max-h-[52vh] overflow-auto rounded-2xl border md:block">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr className="text-left text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                    <th className="px-4 py-3">Size</th>
                                    <th className="px-4 py-3">Price</th>
                                    {props.routeConfig?.hasSwing ? (
                                        <th className="px-4 py-3">Swing</th>
                                    ) : null}
                                    {props.routeConfig?.noHandle ? (
                                        <th className="px-4 py-3">Qty</th>
                                    ) : (
                                        <>
                                            <th className="px-4 py-3">LH</th>
                                            <th className="px-4 py-3">RH</th>
                                        </>
                                    )}
                                    <th className="px-4 py-3 text-right">Line Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => (
                                    <tr key={`door-size-row-${index}`} className="border-t">
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">
                                                <p className="font-semibold text-foreground">
                                                    {formatDoorSizeTitle(row.dimension)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {row.dimension || "--"}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <DoorPriceCell
                                                row={row}
                                                profileCoefficient={
                                                    props.profileCoefficient
                                                }
                                                onSave={(nextBase) =>
                                                    setRows((prev) =>
                                                        prev.map((item, ri) =>
                                                            ri === index
                                                                ? updateDoorRowBasePrice(
                                                                      item,
                                                                      nextBase,
                                                                      props.profileCoefficient,
                                                                  )
                                                                : item,
                                                        ),
                                                    )
                                                }
                                            />
                                        </td>
                                        {props.routeConfig?.hasSwing ? (
                                            <td className="px-4 py-3">
                                                <Input
                                                    value={row.swing || ""}
                                                    onChange={(e) =>
                                                        setRows((prev) =>
                                                            prev.map((item, ri) =>
                                                                ri === index
                                                                    ? {
                                                                          ...item,
                                                                          swing: e.target.value,
                                                                      }
                                                                    : item,
                                                            ),
                                                        )
                                                    }
                                                    placeholder="LH/RH"
                                                    className="h-10 rounded-xl"
                                                />
                                            </td>
                                        ) : null}
                                        {props.routeConfig?.noHandle ? (
                                            <td className="px-4 py-3">
                                                <Input
                                                    type="number"
                                                    value={qtyInputValue(row.totalQty)}
                                                    onChange={(e) =>
                                                        setRows((prev) =>
                                                            prev.map((item, ri) =>
                                                                ri === index
                                                                    ? calcDoorRow({
                                                                          ...item,
                                                                          totalQty: toNumber(
                                                                              e.target.value,
                                                                              0,
                                                                          ),
                                                                          lhQty: 0,
                                                                          rhQty: 0,
                                                                      })
                                                                    : item,
                                                            ),
                                                        )
                                                    }
                                                    className="h-10 w-24 rounded-xl text-right"
                                                />
                                            </td>
                                        ) : (
                                            <>
                                                <td className="px-4 py-3">
                                                    <Input
                                                        type="number"
                                                        value={qtyInputValue(row.lhQty)}
                                                        onChange={(e) =>
                                                            setRows((prev) =>
                                                                prev.map((item, ri) =>
                                                                    ri === index
                                                                        ? calcDoorRow({
                                                                              ...item,
                                                                              lhQty: toNumber(
                                                                                  e.target.value,
                                                                                  0,
                                                                              ),
                                                                          })
                                                                        : item,
                                                                ),
                                                            )
                                                        }
                                                        className="h-10 w-24 rounded-xl text-right"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Input
                                                        type="number"
                                                        value={qtyInputValue(row.rhQty)}
                                                        onChange={(e) =>
                                                            setRows((prev) =>
                                                                prev.map((item, ri) =>
                                                                    ri === index
                                                                        ? calcDoorRow({
                                                                              ...item,
                                                                              rhQty: toNumber(
                                                                                  e.target.value,
                                                                                  0,
                                                                              ),
                                                                          })
                                                                        : item,
                                                                ),
                                                            )
                                                        }
                                                        className="h-10 w-24 rounded-xl text-right"
                                                    />
                                                </td>
                                            </>
                                        )}
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                                            {currency(row.lineTotal)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="border-t bg-muted/20 px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-3 rounded-lg border bg-background p-3 text-sm">
                    <p className="ml-auto">
                        Doors: <span className="font-semibold">{totals.totalDoors}</span>
                    </p>
                    <p>
                        Total: <span className="font-semibold">{currency(totals.totalPrice)}</span>
                    </p>
                    </div>
                </div>
                <DialogFooter className="border-t px-4 py-4 sm:px-5">
                    <Button
                        variant="destructive"
                        onClick={() => {
                            props.onRemoveSelection?.();
                            persistSelection([], false);
                            props.onOpenChange(false);
                        }}
                    >
                        Remove Selection
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            persistSelection();
                            props.onNextStep?.();
                            props.onOpenChange(false);
                        }}
                    >
                        Next Step
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => props.onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            persistSelection();
                            props.onOpenChange(false);
                        }}
                    >
                        Apply
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface MouldingCalculatorDialogProps {
    open: boolean;
    onOpenChange: (next: boolean) => void;
    line: NewSalesFormLineItem;
    onApply: (linePatch: Partial<NewSalesFormLineItem>) => void;
}

export function MouldingCalculatorDialog(props: MouldingCalculatorDialogProps) {
    const moldingMeta = (props.line?.housePackageTool?.molding as any)?.meta || {};
    const [budget, setBudget] = useState<string>(
        String(
            toNumber(
                moldingMeta.budget,
                toNumber(props.line?.lineTotal, 0),
            ).toFixed(2),
        ),
    );
    const [wastePct, setWastePct] = useState<number>(
        toNumber(moldingMeta.wastePct, 10),
    );
    const [selectedLength, setSelectedLength] = useState<string>(
        String(toNumber(moldingMeta.pieceLengthLf, 16)),
    );
    const parsedBudget = Math.max(0, toNumber(budget, 0));
    const pricePerLF = Math.max(
        0.01,
        toNumber(
            moldingMeta.pricePerLF,
            toNumber(props.line?.unitPrice, 2.45) || 2.45,
        ),
    );
    const calculatedBaseLF = parsedBudget / pricePerLF;
    const totalFootage = Math.round(calculatedBaseLF * (1 + Math.max(0, wastePct) / 100));
    const lengthVal = Math.max(1, parseInt(selectedLength || "16", 10) || 16);
    const totalPieces = Math.ceil(totalFootage / lengthVal);

    const calc = useMemo(() => {
        const adjusted = calculatedBaseLF * (1 + Math.max(0, wastePct) / 100);
        const pieces = lengthVal > 0 ? Math.ceil(adjusted / lengthVal) : 0;
        const totalLf = Number((pieces * lengthVal).toFixed(2));
        return {
            adjustedLf: Number(adjusted.toFixed(2)),
            pieces,
            totalLf,
        };
    }, [calculatedBaseLF, lengthVal, wastePct]);

    if (!props.open) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => props.onOpenChange(false)}
        >
            <div
                className="relative w-full max-w-[440px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Price-Based Calculator
                        </span>
                        <h2 className="text-lg font-bold leading-tight text-foreground">
                            {String((props.line?.title || "FLAT BOARD 1 X 6")).toUpperCase()}
                        </h2>
                    </div>
                    <button
                        onClick={() => props.onOpenChange(false)}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="max-h-[70vh] space-y-8 overflow-y-auto p-6">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-primary">$</span>
                            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                                Project Needs
                            </h3>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-muted-foreground">
                                Total Budget / Price
                            </label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">
                                    $
                                </span>
                                <input
                                    className="h-12 w-full rounded-lg border border-input bg-background pl-8 pr-4 text-lg font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    placeholder="0.00"
                                    type="number"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Calculator size={16} className="text-primary" />
                            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                                Product Specs
                            </h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-3 block text-sm font-medium text-muted-foreground">
                                    Piece Length Selection
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {["8", "12", "16", "17"].map((len) => (
                                        <button
                                            key={len}
                                            onClick={() => setSelectedLength(len)}
                                            className={`rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
                                                selectedLength === len
                                                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                            }`}
                                        >
                                            {len}'
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Price per Foot (Derived)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                        $
                                    </span>
                                    <input
                                        className="h-10 w-full cursor-not-allowed rounded-lg border border-border bg-muted/50 pl-8 pr-16 text-sm font-medium text-muted-foreground outline-none"
                                        readOnly
                                        type="text"
                                        value={pricePerLF.toFixed(2)}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-muted-foreground">
                                        Per LF
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Trash2 size={16} className="text-primary" />
                                <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                                    Waste Factor
                                </h3>
                            </div>
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">
                                {wastePct}%
                            </span>
                        </div>
                        <div className="space-y-4">
                            <input
                                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
                                type="range"
                                min="0"
                                max="30"
                                value={wastePct}
                                onChange={(e) => setWastePct(parseInt(e.target.value, 10))}
                            />
                            <p className="text-[11px] italic leading-normal text-muted-foreground">
                                * Waste is added to the calculated footage before determining piece count.
                            </p>
                        </div>
                    </section>

                    <section className="rounded-xl border border-border bg-muted/30 p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-primary" />
                            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                                Results
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                                    Total Pieces
                                </span>
                                <span className="text-3xl font-bold text-foreground">
                                    {totalPieces}
                                </span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                                    Total Footage
                                </span>
                                <span className="text-3xl font-bold text-foreground">
                                    {totalFootage}{" "}
                                    <span className="text-sm font-normal text-muted-foreground">
                                        LF
                                    </span>
                                </span>
                            </div>
                        </div>
                        <div className="mt-3 border-t border-border pt-3">
                            <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">
                                    Budget (${parsedBudget.toFixed(2)}) ÷ ${pricePerLF.toFixed(2)}/LF
                                </span>
                                <span className="font-medium text-muted-foreground">
                                    {calculatedBaseLF.toFixed(1)} LF Base + {wastePct}% Waste
                                </span>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="border-t border-border bg-card p-6">
                    <button
                        onClick={() => {
                            const computedLineTotal =
                                toNumber(props.line.unitPrice, 0) > 0
                                    ? Number((totalPieces * toNumber(props.line.unitPrice, 0)).toFixed(2))
                                    : Number((totalFootage * pricePerLF).toFixed(2));
                            props.onApply({
                                qty: totalPieces,
                                lineTotal: computedLineTotal,
                                housePackageTool: {
                                    ...(props.line.housePackageTool || { id: null }),
                                    molding: {
                                        ...(props.line.housePackageTool?.molding || {
                                            id: null,
                                            title: "Moulding",
                                            value: "",
                                            price: null,
                                        }),
                                        value: `${totalFootage} LF`,
                                        price: computedLineTotal,
                                        meta: {
                                            budget: parsedBudget,
                                            wastePct,
                                            pieceLengthLf: lengthVal,
                                            pricePerLF,
                                            calculatedBaseLF,
                                            totalLengthLf: totalFootage,
                                            adjustedLf: calc.adjustedLf,
                                            pieces: totalPieces,
                                            totalLf: calc.totalLf,
                                        },
                                    } as any,
                                } as any,
                            } as any);
                            props.onOpenChange(false);
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
                    >
                        <CheckCircle2 size={20} />
                        Apply to Invoice
                    </button>
                    <p className="mt-4 text-center text-[11px] text-muted-foreground">
                        Calculated pieces will be applied to your line item quantity.
                    </p>
                </div>
            </div>
        </div>
    );
}
