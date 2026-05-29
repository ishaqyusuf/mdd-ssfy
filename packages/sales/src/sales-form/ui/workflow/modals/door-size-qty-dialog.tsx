"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
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

import type { SalesFormLineItemRecord } from "../../../application";
import {
  calcWorkflowDoorRow,
  clearUnpricedDoorRowQty,
  deriveDoorSizeRows,
  isDoorRowPriceMissing,
  rowsForDoorComponent,
} from "../door-utils";
import {
  type DoorPriceBreakdownContext,
  DoorPriceCell,
  formatDoorSizeTitle,
  updateDoorRowBasePrice,
} from "../door-price-cell";

type DoorLine = NonNullable<
  NonNullable<SalesFormLineItemRecord["housePackageTool"]>["doors"]
>[number];

type DoorSizePriceSaveInput = {
  id?: number | null;
  stepId?: number | null;
  stepProductUid?: string | null;
  dependenciesUid: string;
  price: number | null;
  size: string;
  supplierUid?: string | null;
};

function toNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function currency(value?: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

interface DoorSizeQtyDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  line: SalesFormLineItemRecord;
  routeData?: any;
  component: {
    id?: number | null;
    uid?: string | null;
    stepId?: number | null;
    title?: string | null;
    salesPrice?: number | null;
    basePrice?: number | null;
    pricing?: Record<string, { id?: number; price?: number | null }>;
    supplierVariants?: unknown[];
  } | null;
  supplierUid?: string | null;
  supplierName?: string | null;
  suppliers?: Array<{
    uid: string;
    name: string;
  }>;
  onSupplierChange?: (supplierUid: string | null) => void;
  profileCoefficient?: number | null;
  priceBreakdown?: DoorPriceBreakdownContext | null;
  pricingLabels?: {
    doorPrice?: string;
  };
  routeConfig?: {
    noHandle?: boolean;
    hasSwing?: boolean;
  } | null;
  canEditPricing?: boolean;
  onPriceSave?: (input: DoorSizePriceSaveInput) => Promise<void> | void;
  onRemoveSelection?: () => void;
  onNextStep?: () => void;
  onApply: (payload: { rows: DoorLine[]; selected: boolean }) => void;
}

function doorSizePricingDependency(size: string, supplierUid?: string | null) {
  const normalizedSize = String(size || "").trim();
  const normalizedSupplier = String(supplierUid || "").trim();
  return normalizedSupplier
    ? `${normalizedSize} & ${normalizedSupplier}`
    : normalizedSize;
}

export function DoorSizeQtyDialog(props: DoorSizeQtyDialogProps) {
  const [rows, setRows] = useState<DoorLine[]>([]);

  useEffect(() => {
    if (!props.open || !props.component) return;
    const existing = rowsForDoorComponent(props.line, props.component.id ?? null);
    const nextRows = deriveDoorSizeRows({
      line: props.line,
      existingRows: existing,
      component: props.component,
      routeData: props.routeData,
      supplierUid: props.supplierUid,
      profileCoefficient: props.profileCoefficient,
    }) as DoorLine[];
    setRows(nextRows.map(clearUnpricedDoorRowQty));
  }, [
    props.open,
    props.component,
    props.line,
    props.routeData,
    props.profileCoefficient,
    props.supplierUid,
  ]);

  const totals = useMemo(() => {
    const normalized = rows.map((row) =>
      clearUnpricedDoorRowQty(calcWorkflowDoorRow({
        ...row,
        stepProductId: props.component?.id || row.stepProductId || null,
      })),
    );
    const totalDoors = normalized.reduce(
      (sum, row) => sum + toNumber(row.totalQty),
      0,
    );
    const totalPrice = normalized.reduce(
      (sum, row) => sum + toNumber(row.lineTotal),
      0,
    );
    return {
      normalized,
      totalDoors,
      totalPrice: Number(totalPrice.toFixed(2)),
    };
  }, [rows, props.component]);

  if (!props.component) return null;

  async function saveBasePrice(row: DoorLine, nextBase: number) {
    const size = String(row.dimension || "").trim();
    if (!size) return;
    const dependenciesUid = doorSizePricingDependency(size, props.supplierUid);
    const existingPricing = props.component?.pricing?.[dependenciesUid];
    await props.onPriceSave?.({
      id: existingPricing?.id ?? null,
      stepId: props.component?.stepId ?? null,
      stepProductUid: props.component?.uid ?? null,
      dependenciesUid,
      price: nextBase,
      size,
      supplierUid: props.supplierUid ?? null,
    });
  }

  function persistSelection(nextRows = totals.normalized, selected = true) {
    const persistedRows = nextRows
      .map(clearUnpricedDoorRowQty)
      .filter(
        (row) =>
          selected &&
          !isDoorRowPriceMissing(row) &&
          Number(row.totalQty || 0) > 0,
      );
    props.onApply({
      rows: persistedRows,
      selected: selected && persistedRows.length > 0,
    });
    return true;
  }

  function qtyInputValue(value?: number | null) {
    return Number(value || 0) > 0 ? String(Number(value || 0)) : "";
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex h-[80dvh] max-h-[720px] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-5">
          <DialogTitle>
            {props.component.title || "Door"} Size Select
          </DialogTitle>
          <DialogDescription>
            Select size, price, and quantity for this door option.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-5">
          <div className="flex shrink-0 flex-col gap-3 rounded-xl border bg-slate-50/70 p-3 sm:flex-row sm:items-end sm:justify-between">
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
                  props.onSupplierChange?.(value === "default" ? null : value)
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
                    <SelectItem key={supplier.uid} value={supplier.uid}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 md:hidden">
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
                        profileCoefficient={props.profileCoefficient}
                        priceBreakdown={props.priceBreakdown}
                        readOnly={!props.canEditPricing}
                        onSave={async (nextBase) => {
                          await saveBasePrice(row, nextBase);
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
                          );
                        }}
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
                                ? calcWorkflowDoorRow({
                                    ...item,
                                    totalQty: toNumber(e.target.value, 0),
                                    lhQty: 0,
                                    rhQty: 0,
                                  })
                                : item,
                            ),
                          )
                        }
                        disabled={isDoorRowPriceMissing(row)}
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
                                  ? calcWorkflowDoorRow({
                                      ...item,
                                      lhQty: toNumber(e.target.value, 0),
                                    })
                                  : item,
                              ),
                            )
                          }
                          disabled={isDoorRowPriceMissing(row)}
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
                                  ? calcWorkflowDoorRow({
                                      ...item,
                                      rhQty: toNumber(e.target.value, 0),
                                    })
                                  : item,
                              ),
                            )
                          }
                          disabled={isDoorRowPriceMissing(row)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden min-h-0 flex-1 overflow-auto overscroll-contain rounded-2xl border md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 shadow-sm">
                      Size
                    </th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 shadow-sm">
                      {props.pricingLabels?.doorPrice || "Price"}
                    </th>
                    {props.routeConfig?.hasSwing ? (
                      <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 shadow-sm">
                        Swing
                      </th>
                    ) : null}
                    {props.routeConfig?.noHandle ? (
                      <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 shadow-sm">
                        Qty
                      </th>
                    ) : (
                      <>
                        <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 shadow-sm">
                          LH
                        </th>
                        <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 shadow-sm">
                          RH
                        </th>
                      </>
                    )}
                    <th className="sticky top-0 z-10 bg-slate-50 px-4 py-3 text-right shadow-sm">
                      Line Total
                    </th>
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
                          profileCoefficient={props.profileCoefficient}
                          priceBreakdown={props.priceBreakdown}
                          readOnly={!props.canEditPricing}
                          onSave={async (nextBase) => {
                            await saveBasePrice(row, nextBase);
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
                            );
                          }}
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
                                    ? calcWorkflowDoorRow({
                                        ...item,
                                        totalQty: toNumber(e.target.value, 0),
                                        lhQty: 0,
                                        rhQty: 0,
                                      })
                                    : item,
                                ),
                              )
                            }
                            className="h-10 w-24 rounded-xl text-right"
                            disabled={isDoorRowPriceMissing(row)}
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
                                      ? calcWorkflowDoorRow({
                                          ...item,
                                          lhQty: toNumber(e.target.value, 0),
                                        })
                                      : item,
                                  ),
                                )
                              }
                              className="h-10 w-24 rounded-xl text-right"
                              disabled={isDoorRowPriceMissing(row)}
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
                                      ? calcWorkflowDoorRow({
                                          ...item,
                                          rhQty: toNumber(e.target.value, 0),
                                        })
                                      : item,
                                  ),
                                )
                              }
                              className="h-10 w-24 rounded-xl text-right"
                              disabled={isDoorRowPriceMissing(row)}
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
        </div>
        <div className="shrink-0 border-t bg-muted/20 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3 rounded-lg border bg-background p-3 text-sm">
            <p className="ml-auto">
              Doors: <span className="font-semibold">{totals.totalDoors}</span>
            </p>
            <p>
              Total:{" "}
              <span className="font-semibold">
                {currency(totals.totalPrice)}
              </span>
            </p>
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t px-4 py-4 sm:px-5">
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
              if (!persistSelection()) return;
              props.onNextStep?.();
              props.onOpenChange(false);
            }}
          >
            Next Step
          </Button>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!persistSelection()) return;
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
