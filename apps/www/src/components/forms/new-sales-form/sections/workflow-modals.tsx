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
    const unitPrice = toNumber(row.unitPrice, 0);
    const totalQty = lhQty + rhQty;
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
    } | null;
    onApply: (payload: { rows: DoorLine[]; selected: boolean }) => void;
}

function rowsForComponent(line: NewSalesFormLineItem, componentId: number | null) {
    const rows = (line.housePackageTool?.doors || [])
        .filter((door) => Number(door.stepProductId || 0) === Number(componentId || 0))
        .map(calcDoorRow);
    return rows.length ? rows : [blankDoorRow()];
}

export function DoorSizeQtyDialog(props: DoorSizeQtyDialogProps) {
    const [rows, setRows] = useState<DoorLine[]>([]);

    useEffect(() => {
        if (!props.open || !props.component) return;
        setRows(rowsForComponent(props.line, props.component.id));
    }, [props.open, props.component, props.line]);

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
                <div className="max-h-[60vh] space-y-3 overflow-auto rounded-lg border p-3">
                    <div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <p className="col-span-3">Dimension</p>
                        <p className="col-span-2">Swing</p>
                        <p className="col-span-2">LH</p>
                        <p className="col-span-2">RH</p>
                        <p className="col-span-2">Unit Price</p>
                        <p className="col-span-1">Del</p>
                    </div>
                    {rows.map((row, index) => (
                        <div key={`door-size-row-${index}`} className="grid grid-cols-12 gap-2">
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
                                                      lhQty: toNumber(e.target.value, 0),
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
                                                      rhQty: toNumber(e.target.value, 0),
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
                                    setRows((prev) => prev.filter((_, ri) => ri !== index))
                                }
                            >
                                X
                            </Button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            setRows((prev) => [
                                ...prev,
                                calcDoorRow({
                                    ...blankDoorRow(),
                                    stepProductId: props.component?.id || null,
                                    unitPrice: Number(
                                        props.component?.salesPrice ??
                                            props.component?.basePrice ??
                                            0,
                                    ),
                                }),
                            ])
                        }
                    >
                        Add Size Row
                    </Button>
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
                            props.onApply({
                                rows: totals.normalized,
                                selected: totals.totalDoors > 0,
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
    const [totalLengthLf, setTotalLengthLf] = useState<number>(
        toNumber(moldingMeta.totalLengthLf, 0),
    );
    const [wastePct, setWastePct] = useState<number>(
        toNumber(moldingMeta.wastePct, 10),
    );
    const [pieceLengthLf, setPieceLengthLf] = useState<number>(
        toNumber(moldingMeta.pieceLengthLf, 16),
    );

    const calc = useMemo(() => {
        const adjusted = totalLengthLf * (1 + Math.max(0, wastePct) / 100);
        const pieces = pieceLengthLf > 0 ? Math.ceil(adjusted / pieceLengthLf) : 0;
        const totalLf = Number((pieces * pieceLengthLf).toFixed(2));
        return {
            adjustedLf: Number(adjusted.toFixed(2)),
            pieces,
            totalLf,
        };
    }, [pieceLengthLf, totalLengthLf, wastePct]);

    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Moulding Calculator</DialogTitle>
                    <DialogDescription>
                        Estimate piece count and total linear footage with waste.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Required Length (LF)</p>
                        <Input
                            type="number"
                            step="0.01"
                            value={totalLengthLf}
                            onChange={(e) => setTotalLengthLf(toNumber(e.target.value, 0))}
                        />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Waste (%)</p>
                        <Input
                            type="number"
                            step="0.01"
                            value={wastePct}
                            onChange={(e) => setWastePct(toNumber(e.target.value, 0))}
                        />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Piece Length (LF)</p>
                        <Input
                            type="number"
                            step="0.01"
                            value={pieceLengthLf}
                            onChange={(e) => setPieceLengthLf(toNumber(e.target.value, 0))}
                        />
                    </div>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <p>
                        Adjusted LF: <span className="font-semibold">{calc.adjustedLf.toFixed(2)}</span>
                    </p>
                    <p>
                        Pieces: <span className="font-semibold">{calc.pieces}</span>
                    </p>
                    <p>
                        Purchasable LF: <span className="font-semibold">{calc.totalLf.toFixed(2)}</span>
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
                            const unitPrice = toNumber(props.line.unitPrice, 0);
                            props.onApply({
                                qty: calc.pieces,
                                lineTotal: Number((calc.pieces * unitPrice).toFixed(2)),
                                housePackageTool: {
                                    ...(props.line.housePackageTool || { id: null }),
                                    molding: {
                                        ...(props.line.housePackageTool?.molding || {
                                            id: null,
                                            title: "Moulding",
                                            value: "",
                                            price: null,
                                        }),
                                        value: `${calc.totalLf.toFixed(2)} LF`,
                                        meta: {
                                            totalLengthLf,
                                            wastePct,
                                            pieceLengthLf,
                                            adjustedLf: calc.adjustedLf,
                                            pieces: calc.pieces,
                                            totalLf: calc.totalLf,
                                        },
                                    } as any,
                                } as any,
                            } as any);
                            props.onOpenChange(false);
                        }}
                    >
                        Apply Calculator
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
