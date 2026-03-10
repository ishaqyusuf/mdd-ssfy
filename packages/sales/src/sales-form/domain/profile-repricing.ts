function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toFinite(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toProfileMultiplier(coefficient?: number | null) {
  const coeff = Number(coefficient);
  if (!Number.isFinite(coeff) || coeff === 0) return 1;
  return roundCurrency(1 / coeff);
}

function valueFromPath(source: unknown, path: string[]): unknown {
  let cursor = source as Record<string, unknown> | null | undefined;
  for (const key of path) {
    if (!cursor || typeof cursor !== "object") return null;
    cursor = cursor[key] as Record<string, unknown> | null | undefined;
  }
  return cursor;
}

function firstFinite(source: unknown, paths: string[][]) {
  for (const path of paths) {
    const value = toFinite(valueFromPath(source, path));
    if (value != null) return value;
  }
  return null;
}

export type SalesFormProfileStepLike = {
  price?: number | null;
  basePrice?: number | null;
  meta?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type SalesFormProfileShelfItemLike = {
  qty?: number | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  meta?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type SalesFormProfileDoorLike = {
  totalQty?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  meta?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type SalesFormHousePackageToolLike = {
  doors?: SalesFormProfileDoorLike[] | null;
  totalDoors?: number | null;
  totalPrice?: number | null;
  [key: string]: unknown;
};

export type SalesFormProfileLineItemLike = {
  qty?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  formSteps?: SalesFormProfileStepLike[] | null;
  shelfItems?: SalesFormProfileShelfItemLike[] | null;
  housePackageTool?: SalesFormHousePackageToolLike | null;
  [key: string]: unknown;
};

export function repriceSalesFormLineItemsByProfile<
  TLine extends SalesFormProfileLineItemLike,
>(
  lineItems: TLine[],
  previousProfileCoefficient?: number | null,
  nextProfileCoefficient?: number | null,
): TLine[] {
  const prevMultiplier = toProfileMultiplier(previousProfileCoefficient);
  const nextMultiplier = toProfileMultiplier(nextProfileCoefficient);
  const ratio = prevMultiplier === 0 ? 1 : nextMultiplier / prevMultiplier;

  return (lineItems || []).map((line) => {
    const formSteps = (line.formSteps || []).map((step) => {
      const selectedComponents = Array.isArray(step?.meta?.selectedComponents)
        ? step.meta.selectedComponents.map((component: any) => {
            const componentBase = toFinite(component?.basePrice);
            const currentSales = toFinite(component?.salesPrice);
            return {
              ...component,
              salesPrice:
                componentBase != null
                  ? roundCurrency(componentBase * nextMultiplier)
                  : currentSales != null
                    ? roundCurrency(currentSales * ratio)
                    : currentSales,
            };
          })
        : step?.meta?.selectedComponents;

      const selectedComponentsPrice = Array.isArray(selectedComponents)
        ? selectedComponents.reduce((sum: number, component: any) => {
            const sales = toFinite(component?.salesPrice);
            return sum + Number(sales || 0);
          }, 0)
        : null;
      const hasSelectedComponentsPrice =
        selectedComponentsPrice != null &&
        Array.isArray(selectedComponents) &&
        selectedComponents.some((component: any) =>
          Number.isFinite(Number(component?.salesPrice)),
        );

      const basePrice = toFinite(step?.basePrice);
      const currentPrice = toFinite(step?.price);
      const nextPrice = hasSelectedComponentsPrice
        ? roundCurrency(Number(selectedComponentsPrice || 0))
        : basePrice != null
          ? roundCurrency(basePrice * nextMultiplier)
          : currentPrice != null
            ? roundCurrency(currentPrice * ratio)
            : currentPrice;

      return {
        ...step,
        price: nextPrice,
        meta:
          selectedComponents == null
            ? step?.meta
            : {
                ...(step?.meta || {}),
                selectedComponents,
              },
      };
    });

    const shelfItems = (line.shelfItems || []).map((row) => {
      const unitPrice = toFinite(row?.unitPrice) ?? 0;
      const qty = toFinite(row?.qty) ?? 0;
      const baseUnitPrice = firstFinite(row, [
        ["basePrice"],
        ["baseUnitPrice"],
        ["meta", "basePrice"],
        ["meta", "baseUnitPrice"],
        ["meta", "priceData", "baseUnitCost"],
        ["meta", "priceData", "basePrice"],
      ]);
      const nextUnitPrice =
        baseUnitPrice != null
          ? roundCurrency(baseUnitPrice * nextMultiplier)
          : roundCurrency(unitPrice * ratio);
      return {
        ...row,
        unitPrice: nextUnitPrice,
        totalPrice: roundCurrency(qty * nextUnitPrice),
      };
    });

    const existingDoors = line.housePackageTool?.doors || [];
    const doors = existingDoors.map((door) => {
      const currentUnit = toFinite(door?.unitPrice) ?? 0;
      const totalQty = toFinite(door?.totalQty) ?? 0;
      const baseUnitPrice = firstFinite(door, [
        ["basePrice"],
        ["baseUnitPrice"],
        ["meta", "basePrice"],
        ["meta", "baseUnitPrice"],
        ["meta", "priceData", "baseUnitCost"],
        ["meta", "priceData", "basePrice"],
      ]);
      const nextUnit =
        baseUnitPrice != null
          ? roundCurrency(baseUnitPrice * nextMultiplier)
          : roundCurrency(currentUnit * ratio);
      return {
        ...door,
        unitPrice: nextUnit,
        lineTotal: roundCurrency(totalQty * nextUnit),
      };
    });

    const doorQty = doors.reduce(
      (sum, row) => sum + Number(row?.totalQty || 0),
      0,
    );
    const doorTotal = doors.reduce(
      (sum, row) => sum + Number(row?.lineTotal || 0),
      0,
    );
    const stepUnit = formSteps.reduce((sum, step) => {
      const value = toFinite(step?.price);
      return sum + Number(value || 0);
    }, 0);
    const shelfTotal = shelfItems.reduce(
      (sum, row) => sum + Number(row?.totalPrice || 0),
      0,
    );

    let qty = Number(line.qty || 0);
    let unitPrice = Number(line.unitPrice || 0);
    let lineTotal = Number(line.lineTotal || qty * unitPrice);

    if (doors.length) {
      qty = doorQty || qty;
      lineTotal = roundCurrency(doorTotal);
      unitPrice = qty > 0 ? roundCurrency(lineTotal / qty) : unitPrice;
    } else if (shelfItems.length) {
      lineTotal = roundCurrency(shelfTotal);
      unitPrice = qty > 0 ? roundCurrency(lineTotal / qty) : unitPrice;
    } else if (formSteps.length) {
      unitPrice = roundCurrency(stepUnit);
      lineTotal = roundCurrency(qty * unitPrice);
    } else {
      unitPrice = roundCurrency(unitPrice * ratio);
      lineTotal = roundCurrency(qty * unitPrice);
    }

    return {
      ...line,
      qty,
      unitPrice,
      lineTotal,
      formSteps,
      shelfItems,
      housePackageTool: line.housePackageTool
        ? {
            ...line.housePackageTool,
            doors,
            totalDoors: doors.length ? doorQty : line.housePackageTool.totalDoors,
            totalPrice: doors.length
              ? roundCurrency(doorTotal)
              : line.housePackageTool.totalPrice,
          }
        : line.housePackageTool,
    } as TLine;
  });
}
