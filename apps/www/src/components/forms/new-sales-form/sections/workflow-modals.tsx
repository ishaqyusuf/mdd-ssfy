"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
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

type DoorLine = NonNullable<
    NonNullable<NewSalesFormLineItem["housePackageTool"]>["doors"]
>[number];

function toNumber(value: unknown, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
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
    routeConfig?: {
        noHandle?: boolean;
        hasSwing?: boolean;
    } | null;
    onApply: (payload: { rows: DoorLine[]; selected: boolean }) => void;
}

function rowsForComponent(line: NewSalesFormLineItem, componentId: number | null) {
    const rows = (line.housePackageTool?.doors || [])
        .filter((door) => Number(door.stepProductId || 0) === Number(componentId || 0))
        .map(calcDoorRow);
    return rows;
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
function deriveDoorSizeRows(
    existingRows: DoorLine[],
    component: DoorSizeQtyDialogProps["component"],
    supplierUid?: string | null,
) {
    const bySize = new Map<string, DoorLine>();
    existingRows.forEach((row) => {
        if (row.dimension) bySize.set(String(row.dimension).trim(), row);
    });
    const pricing = component?.pricing || {};
    const keys = Object.keys(pricing || {});
    const candidateSizes = Array.from(
        new Set(
            keys
                .map((key) => resolveSizeFromPricingKey(key, supplierUid))
                .filter(Boolean),
        ),
    );
    if (!candidateSizes.length) {
        if (existingRows.length) return existingRows;
        return [
            calcDoorRow({
                ...blankDoorRow(),
                stepProductId: component?.id || null,
                unitPrice: Number(component?.salesPrice ?? component?.basePrice ?? 0),
            }),
        ];
    }

    return candidateSizes.map((size) => {
        const normalizedSize = String(size).trim();
        const existing = bySize.get(normalizedSize);
        const supplierKey = supplierUid
            ? `${normalizedSize} & ${supplierUid}`
            : null;
        const priceBucket =
            (supplierKey ? pricing?.[supplierKey] : null) ||
            pricing?.[normalizedSize] ||
            null;
        const computedPrice = Number(priceBucket?.price);
        const unitPrice = Number.isFinite(computedPrice)
            ? computedPrice
            : Number(component?.salesPrice ?? component?.basePrice ?? existing?.unitPrice ?? 0);
        return calcDoorRow({
            ...(existing || blankDoorRow()),
            dimension: normalizedSize,
            stepProductId: component?.id || existing?.stepProductId || null,
            unitPrice,
        });
    });
}

export function DoorSizeQtyDialog(props: DoorSizeQtyDialogProps) {
    const [rows, setRows] = useState<DoorLine[]>([]);

    useEffect(() => {
        if (!props.open || !props.component) return;
        const existing = rowsForComponent(props.line, props.component.id);
        const nextRows = deriveDoorSizeRows(
            existing,
            props.component,
            props.supplierUid,
        );
        setRows(nextRows);
    }, [props.open, props.component, props.line, props.supplierUid]);

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

    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{props.component.title || "Door"} Size/Qty</DialogTitle>
                    <DialogDescription>
                        Set dimensions and quantities for this door component.
                    </DialogDescription>
                </DialogHeader>
                <div className="text-xs text-muted-foreground">
                    Supplier: <span className="font-semibold text-foreground">{props.supplierName || "GND MILLWORK"}</span>
                </div>
                <div className="max-h-[60vh] space-y-3 overflow-auto rounded-lg border p-3">
                    <div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <p className="col-span-3">Dimension</p>
                        {props.routeConfig?.hasSwing ? (
                            <p className="col-span-2">Swing</p>
                        ) : (
                            <p className="col-span-2" />
                        )}
                        {props.routeConfig?.noHandle ? (
                            <p className="col-span-4">Qty</p>
                        ) : (
                            <>
                                <p className="col-span-2">LH</p>
                                <p className="col-span-2">RH</p>
                            </>
                        )}
                        <p className="col-span-2">Unit Price</p>
                        <p className="col-span-1">Del</p>
                    </div>
                    {rows.map((row, index) => (
                        <div key={`door-size-row-${index}`} className="grid grid-cols-12 gap-2">
                            <Input
                                className="col-span-3"
                                value={row.dimension || ""}
                                placeholder="2-8 x 8-0"
                                readOnly
                            />
                            {props.routeConfig?.hasSwing ? (
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
                            ) : (
                                <div className="col-span-2" />
                            )}
                            {props.routeConfig?.noHandle ? (
                                <Input
                                    className="col-span-4"
                                    type="number"
                                    value={row.totalQty || 0}
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
                            ) : (
                                <>
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
                                </>
                            )}
                            <Input
                                className="col-span-2"
                                type="number"
                                step="0.01"
                                value={row.unitPrice || props.component?.salesPrice || 0}
                                onChange={(e) =>
                                    setRows((prev) =>
                                        prev.map((item, ri) =>
                                            ri === index
                                                ? calcDoorRow({
                                                      ...item,
                                                      unitPrice: toNumber(e.target.value, 0),
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
                                    setRows((prev) =>
                                        prev.map((item, ri) =>
                                            ri === index
                                                ? calcDoorRow({
                                                      ...item,
                                                      lhQty: 0,
                                                      rhQty: 0,
                                                      totalQty: 0,
                                                  })
                                                : item,
                                        ),
                                    )
                                }
                            >
                                X
                            </Button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
                    <p className="ml-auto">
                        Doors: <span className="font-semibold">{totals.totalDoors}</span>
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
                            const persistedRows = totals.normalized.filter(
                                (row) => Number(row.totalQty || 0) > 0,
                            );
                            props.onApply({
                                rows: persistedRows,
                                selected: persistedRows.length > 0,
                            });
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
