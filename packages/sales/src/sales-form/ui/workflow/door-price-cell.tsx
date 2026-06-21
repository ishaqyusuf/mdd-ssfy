/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@gnd/ui/hover-card";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { useEffect, useState } from "react";
import { getHptDoorSalesUnitPrice } from "../../domain";
import { profileAdjustedDoorSalesPrice } from "./door-pricing";
import type { DoorPriceRow } from "./door-price-update";

export {
  patchDoorRowCustomPrice,
  updateDoorRowBasePrice,
} from "./door-price-update";
export type { DoorPriceRow } from "./door-price-update";

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

function firstPositiveNumber(...values: unknown[]) {
  for (const value of values) {
    const candidate = Number(value);
    if (Number.isFinite(candidate) && candidate > 0) return candidate;
  }
  return null;
}

function currency(value?: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type DoorPriceBreakdownContext = {
  enabled?: boolean;
  internalProfileCoefficient?: number | null;
  dealerSalesPercentage?: number | null;
  displayUnitPrice?: number | null;
  labels?: DoorPriceBreakdownLabels;
};

export type DoorPriceBreakdownLabels = {
  priceBreakdown?: string;
  costPrice?: string;
  salesPrice?: string;
  margin?: string;
};

export type DoorPriceBreakdown = {
  internalUnitPrice: number;
  dealerUnitPrice: number;
  marginAmount: number;
  marginPercent: number;
};

export function resolveDoorPriceBreakdown(
  row: DoorPriceRow,
  context?: DoorPriceBreakdownContext | null,
): DoorPriceBreakdown | null {
  if (!context?.enabled || row.meta?.priceMissing) return null;

  const baseUnit = firstFiniteNumber(row.meta?.baseUnitPrice);
  const dealerMultiplier = 1 + toNumber(context.dealerSalesPercentage, 0) / 100;
  const dealerUnitFromRow = firstPositiveNumber(
    context.displayUnitPrice,
    row.meta?.doorSalesUnitPrice,
    row.jambSizePrice,
    row.unitPrice,
  );
  const internalUnitFromBase =
    baseUnit != null && baseUnit > 0
      ? profileAdjustedDoorSalesPrice(
          null,
          baseUnit,
          context.internalProfileCoefficient,
        )
      : null;
  const dealerUnitPrice =
    dealerUnitFromRow != null
      ? roundCurrency(dealerUnitFromRow)
      : internalUnitFromBase != null
        ? roundCurrency(internalUnitFromBase * dealerMultiplier)
        : baseUnit === 0
          ? 0
          : null;

  if (dealerUnitPrice == null) return null;

  const internalUnitPrice =
    internalUnitFromBase != null
      ? internalUnitFromBase
      : dealerMultiplier > 0
        ? roundCurrency(dealerUnitPrice / dealerMultiplier)
        : dealerUnitPrice;
  const marginAmount = roundCurrency(dealerUnitPrice - internalUnitPrice);

  return {
    internalUnitPrice,
    dealerUnitPrice,
    marginAmount,
    marginPercent: dealerUnitPrice
      ? (marginAmount / dealerUnitPrice) * 100
      : 0,
  };
}

function feetInchToInches(value: string) {
  const [feetPart, inchPart = "0"] = value.split("-");
  const feet = Number(feetPart || 0);
  const inches = Number(inchPart || 0);
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return "";
  return `${feet * 12 + inches}"`;
}

export function formatDoorSizeTitle(size?: string | null) {
  const [width, height] = String(size || "").split(" x ");
  const widthIn = width ? feetInchToInches(width.trim()) : "";
  const heightIn = height ? feetInchToInches(height.trim()) : "";
  if (!widthIn || !heightIn) return String(size || "--");
  return `${widthIn} x ${heightIn}`;
}

export function DoorPriceCell({
  row,
  onSave,
  profileCoefficient,
  priceBreakdown,
  readOnly = false,
}: {
  row: DoorPriceRow;
  onSave: (nextBase: number) => void | Promise<void>;
  profileCoefficient?: number | null;
  priceBreakdown?: DoorPriceBreakdownContext | null;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const baseUnit = firstFiniteNumber(row.meta?.baseUnitPrice);
  const hasStoredBasePrice = baseUnit != null;
  const isMissingPrice = Boolean(row.meta?.priceMissing);
  const doorSalesPrice = hasStoredBasePrice
    ? profileAdjustedDoorSalesPrice(null, baseUnit, profileCoefficient)
    : toNumber(row.unitPrice, 0);
  const displayDoorPrice = getHptDoorSalesUnitPrice(row, {
    profileCoefficient,
  });
  const breakdown = resolveDoorPriceBreakdown(row, {
    ...priceBreakdown,
    displayUnitPrice: displayDoorPrice,
  });
  const breakdownLabels = {
    priceBreakdown:
      priceBreakdown?.labels?.priceBreakdown || "Price breakdown",
    costPrice: priceBreakdown?.labels?.costPrice || "Cost price (internal)",
    salesPrice:
      priceBreakdown?.labels?.salesPrice || "Sales price (dealer)",
    margin: priceBreakdown?.labels?.margin || "Margin",
  };
  const readOnlyPrice = (
    <div className="flex h-8 w-full min-w-[92px] items-center justify-end px-2 text-right">
      <span className="block text-sm font-semibold text-foreground">
        {isMissingPrice ? "Missing" : currency(displayDoorPrice)}
      </span>
    </div>
  );

  useEffect(() => {
    setDraft(
      isMissingPrice || !hasStoredBasePrice || !baseUnit
        ? ""
        : String(baseUnit),
    );
  }, [baseUnit, hasStoredBasePrice, isMissingPrice, open]);

  if (readOnly) {
    if (!breakdown) return readOnlyPrice;

    return (
      <HoverCard openDelay={150} closeDelay={100}>
        <HoverCardTrigger asChild>{readOnlyPrice}</HoverCardTrigger>
        <HoverCardContent align="end" className="w-64 space-y-3 p-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {breakdownLabels.priceBreakdown}
            </p>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {breakdownLabels.costPrice}
              </span>
              <span className="font-semibold text-foreground">
                {currency(breakdown.internalUnitPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {breakdownLabels.salesPrice}
              </span>
              <span className="font-semibold text-foreground">
                {currency(breakdown.dealerUnitPrice)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t pt-2">
              <span className="text-muted-foreground">
                {breakdownLabels.margin}
              </span>
              <span className="font-semibold text-foreground">
                {`${currency(breakdown.marginAmount)} (${breakdown.marginPercent.toFixed(1)}%)`}
              </span>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          disabled={isSaving}
          variant={
            isMissingPrice
              ? "destructive"
              : Number(row.unitPrice || 0) > 0
                ? "outline"
                : "secondary"
          }
          className="h-8 w-full min-w-[92px] justify-end rounded-lg border-slate-300 px-2 text-right"
        >
          <span className="text-sm font-semibold text-foreground">
            {isMissingPrice && !readOnly
              ? "Add Price"
              : currency(displayDoorPrice)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {isMissingPrice || !hasStoredBasePrice
              ? "Set Base Price"
              : "Edit Base Price"}
          </p>
          <p className="text-xs text-muted-foreground">
            Final price keeps the current surcharge delta and updates from this
            base.
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
            onChange={(event) => setDraft(event.target.value)}
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
            disabled={isSaving}
            onClick={async () => {
              const nextBase = toNumber(draft, Number.NaN);
              if (!Number.isFinite(nextBase) || nextBase < 0) return;
              try {
                setIsSaving(true);
                await onSave(nextBase);
                setOpen(false);
              } finally {
                setIsSaving(false);
              }
            }}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
