type ExtraCostType =
  | "Discount"
  | "DiscountPercentage"
  | "Labor"
  | "FlatLabor"
  | "CustomTaxxable"
  | "CustomNonTaxxable"
  | "Delivery"
  | "EXT"
  | string;

type FormStepLike = {
  step?: { title?: string | null } | null;
  value?: string | null;
};

type LineItemLike = {
  qty?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  taxxable?: boolean | null;
  meta?: Record<string, unknown> | null;
  formSteps?: FormStepLike[] | null;
};

type ExtraCostLike = {
  type: ExtraCostType;
  amount?: number | null;
};

export type NewSalesFormCostingStrategy = "current" | "legacy";

export type CalculateNewSalesFormSummaryInput = {
  taxRate?: number | null;
  lineItems: LineItemLike[];
  extraCosts?: ExtraCostLike[];
  paymentMethod?: string | null;
  strategy?: NewSalesFormCostingStrategy;
};

export type NewSalesFormSummaryResult = {
  subTotal: number;
  adjustedSubTotal: number;
  taxRate: number;
  taxTotal: number;
  grandTotal: number;
  discount: number;
  discountPct: number;
  percentDiscountValue: number;
  labor: number;
  delivery: number;
  otherCosts: number;
  taxableSubTotal: number;
  ccc: number;
  strategy: NewSalesFormCostingStrategy;
};

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function safeNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function normalizeTitle(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function inferItemType(line: LineItemLike) {
  const itemTypeStep = (line.formSteps || []).find(
    (step) => normalizeTitle(step?.step?.title) === "item type",
  );
  return normalizeTitle(itemTypeStep?.value);
}

function isTaxableLineLegacy(line: LineItemLike) {
  if (typeof line.taxxable === "boolean") return line.taxxable;
  const itemType = inferItemType(line);
  const isService = itemType === "services" || itemType === "service";
  if (isService) {
    const metaTaxxable = (line.meta as { taxxable?: unknown } | null)?.taxxable;
    if (typeof metaTaxxable === "boolean") return metaTaxxable;
    return false;
  }
  return true;
}

function sumByType(extraCosts: ExtraCostLike[], types: string[]) {
  return roundCurrency(
    extraCosts
      .filter((cost) => types.includes(String(cost.type)))
      .reduce((sum, cost) => sum + safeNumber(cost.amount), 0),
  );
}

export function calculateNewSalesFormSummary(
  input: CalculateNewSalesFormSummaryInput,
): NewSalesFormSummaryResult {
  const strategy = input.strategy || "current";
  const lineItems = input.lineItems || [];
  const extraCosts = input.extraCosts || [];

  const subTotal = roundCurrency(
    lineItems.reduce((sum, line) => {
      const qty = safeNumber(line.qty);
      const unitPrice = safeNumber(line.unitPrice);
      const computed = roundCurrency(qty * unitPrice);
      const lineTotalRaw =
        line.lineTotal == null ? computed : safeNumber(line.lineTotal);
      return sum + lineTotalRaw;
    }, 0),
  );

  const discount = sumByType(extraCosts, ["Discount"]);
  const discountPct = sumByType(extraCosts, ["DiscountPercentage"]);
  const labor = sumByType(extraCosts, ["Labor"]);
  const flatLabor = sumByType(extraCosts, ["FlatLabor"]);
  const delivery = sumByType(extraCosts, ["Delivery"]);
  const otherCosts = roundCurrency(
    extraCosts
      .filter(
        (cost) =>
          ![
            "Labor",
            "FlatLabor",
            "Delivery",
            "Discount",
            "DiscountPercentage",
          ].includes(String(cost.type)),
      )
      .reduce((sum, cost) => sum + safeNumber(cost.amount), 0),
  );

  const normalizedTaxRate = Math.max(0, Math.min(100, safeNumber(input.taxRate)));
  const percentDiscountValue = roundCurrency(subTotal * (discountPct / 100));
  const adjustedSubTotal = roundCurrency(
    subTotal - discount - percentDiscountValue + labor + delivery + otherCosts,
  );

  if (strategy === "legacy") {
    const taxableLineSubTotal = roundCurrency(
      lineItems.reduce((sum, line) => {
        const qty = safeNumber(line.qty);
        const unitPrice = safeNumber(line.unitPrice);
        const computed = roundCurrency(qty * unitPrice);
        const lineTotalRaw =
          line.lineTotal == null ? computed : safeNumber(line.lineTotal);
        return isTaxableLineLegacy(line) ? sum + lineTotalRaw : sum;
      }, 0),
    );

    const taxableBeforeDiscount = roundCurrency(
      taxableLineSubTotal + delivery + otherCosts,
    );
    const maxTaxableDiscount = roundCurrency(
      Math.min(discount + percentDiscountValue, taxableBeforeDiscount),
    );
    const taxableSubTotal = roundCurrency(
      Math.max(0, taxableBeforeDiscount - maxTaxableDiscount),
    );
    const taxTotal = roundCurrency(taxableSubTotal * (normalizedTaxRate / 100));
    const grandBeforeCcc = roundCurrency(
      subTotal - discount - percentDiscountValue + delivery + labor + flatLabor + otherCosts + taxTotal,
    );
    const isCreditCard =
      normalizeTitle(input.paymentMethod) === "credit card" ||
      normalizeTitle(input.paymentMethod) === "card";
    const ccc = isCreditCard
      ? roundCurrency((grandBeforeCcc * 3) / 100)
      : 0;

    return {
      subTotal,
      adjustedSubTotal,
      taxRate: normalizedTaxRate,
      taxTotal,
      grandTotal: roundCurrency(grandBeforeCcc + ccc),
      discount,
      discountPct,
      percentDiscountValue,
      labor: roundCurrency(labor + flatLabor),
      delivery,
      otherCosts,
      taxableSubTotal,
      ccc,
      strategy,
    };
  }

  const taxableSubTotal = roundCurrency(Math.max(0, adjustedSubTotal));
  const taxTotal = roundCurrency(taxableSubTotal * (normalizedTaxRate / 100));
  const grandTotal = roundCurrency(taxableSubTotal + taxTotal);
  return {
    subTotal,
    adjustedSubTotal,
    taxRate: normalizedTaxRate,
    taxTotal,
    grandTotal,
    discount,
    discountPct,
    percentDiscountValue,
    labor: roundCurrency(labor + flatLabor),
    delivery,
    otherCosts,
    taxableSubTotal,
    ccc: 0,
    strategy,
  };
}
