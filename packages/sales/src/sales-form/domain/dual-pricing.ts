import { calculateSalesFormSummary } from "./costing";
import {
	divideMoney,
	multiplyMoney,
	roundMoney,
} from "../../payment-system/domain/money";

export type SalesFormPricingProfile = {
  id?: number | null;
  coefficient?: number | null;
  salesPercentage?: number | null;
  label?: string | null;
};

export type DualPricingLineInput = {
  uid: string;
  title?: string | null;
  qty?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  taxxable?: boolean | null;
  meta?: Record<string, unknown> | null;
  formSteps?: Array<Record<string, any>> | null;
  shelfItems?: Array<Record<string, any>> | null;
  housePackageTool?: Record<string, any> | null;
};

export type DualPricingExtraCostInput = {
  type: string;
  amount?: number | null;
  taxxable?: boolean | null;
};

export type DualPricingInput = {
  lineItems: DualPricingLineInput[];
  extraCosts?: DualPricingExtraCostInput[];
  taxRate?: number | null;
  paymentMethod?: string | null;
  cccPercentage?: number | null;
  internalProfile?: SalesFormPricingProfile | null;
  dealerProfile?: SalesFormPricingProfile | null;
};

export type DualPricingLineResult = {
  uid: string;
  title: string | null;
  qty: number;
  internalUnitPrice: number;
  internalLineTotal: number;
  dealerUnitPrice: number;
  dealerLineTotal: number;
};

export type DualPricingResult = {
  internalProfileId: number | null;
  dealerProfileId: number | null;
  internalPricing: ReturnType<typeof calculateSalesFormSummary>;
  dealerPricing: ReturnType<typeof calculateSalesFormSummary>;
  lines: DualPricingLineResult[];
};

export type DualPricingSnapshot = DualPricingResult & {
  source: "sales_form_dual_pricing";
  createdAt: string;
  profiles: {
    internal: {
      id: number | null;
      label: string | null;
      coefficient: number;
    };
    dealer: {
      id: number | null;
      label: string | null;
      coefficient: number;
      salesPercentage: number;
    };
  };
};

function roundCurrency(value: number) {
  return roundMoney(value);
}

function coefficientValue(profile?: SalesFormPricingProfile | null) {
  const value = Number(profile?.coefficient ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function coefficientMultiplier(profile?: SalesFormPricingProfile | null) {
  return divideMoney(1, coefficientValue(profile));
}

function salesPercentageValue(profile?: SalesFormPricingProfile | null) {
  const value = Number(profile?.salesPercentage ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function salesPercentageMultiplier(profile?: SalesFormPricingProfile | null) {
  return 1 + salesPercentageValue(profile) / 100;
}

function normalizeLine(line: DualPricingLineInput, multiplier: number) {
  const qty = Number(line.qty ?? 0);
  const baseUnitPrice = Number(line.unitPrice ?? 0);
  const unitPrice = multiplyMoney(baseUnitPrice, multiplier);
  const lineTotal = multiplyMoney(qty, unitPrice);

  return {
    ...line,
    qty,
    unitPrice,
    lineTotal,
  };
}

function normalizeDealerLine(
  line: ReturnType<typeof normalizeLine>,
  multiplier: number,
) {
  const unitPrice = multiplyMoney(Number(line.unitPrice || 0), multiplier);
  const lineTotal = multiplyMoney(Number(line.qty || 0), unitPrice);

  return {
    ...line,
    unitPrice,
    lineTotal,
  };
}

function hasCustomerPricedRows(line: DualPricingLineInput) {
  const meta = line.meta || {};
  return Boolean(
    line.shelfItems?.length ||
      Number(line.housePackageTool?.totalPrice || 0) > 0 ||
      (Array.isArray(meta.mouldingRows) && meta.mouldingRows.length) ||
      (Array.isArray(meta.serviceRows) && meta.serviceRows.length),
  );
}

function priceCustomerStructuredLine(
  line: DualPricingLineInput,
  dealerMultiplier: number,
) {
  const qty = Number(line.qty ?? 0);
  const dealerLineTotal = roundMoney(
    calculateSalesFormSummary({
      strategy: "legacy",
      taxRate: 0,
      lineItems: [line],
      extraCosts: [],
    }).subTotal,
  );
  const internalLineTotal = divideMoney(
    dealerLineTotal,
    dealerMultiplier > 0 ? dealerMultiplier : 1,
  );
  const internalUnitPrice = qty > 0 ? divideMoney(internalLineTotal, qty) : 0;
  const dealerUnitPrice = qty > 0 ? divideMoney(dealerLineTotal, qty) : 0;
  // Summary inputs are flat because nested rows already carry customer prices.
  const flatLine = {
    ...line,
    shelfItems: [],
    housePackageTool: null,
    meta: {
      ...line.meta,
      mouldingRows: [],
      serviceRows: [],
    },
  };
  return {
    internal: {
      ...flatLine,
      qty,
      unitPrice: internalUnitPrice,
      lineTotal: internalLineTotal,
    },
    dealer: {
      ...flatLine,
      qty,
      unitPrice: dealerUnitPrice,
      lineTotal: dealerLineTotal,
    },
  };
}

export function calculateDualSalesFormPricing(
  input: DualPricingInput,
): DualPricingResult {
  const internalMultiplier = coefficientMultiplier(input.internalProfile);
  const dealerMultiplier = salesPercentageMultiplier(input.dealerProfile);

  const pricedLines = (input.lineItems || []).map((line) =>
    hasCustomerPricedRows(line)
      ? priceCustomerStructuredLine(line, dealerMultiplier)
      : (() => {
          const internal = normalizeLine(line, internalMultiplier);
          return { internal, dealer: normalizeDealerLine(internal, dealerMultiplier) };
        })(),
  );
  const internalLines = pricedLines.map((line) => line.internal);
  const dealerLines = pricedLines.map((line) => line.dealer);

  return {
    internalProfileId: input.internalProfile?.id ?? null,
    dealerProfileId: input.dealerProfile?.id ?? null,
    internalPricing: calculateSalesFormSummary({
      strategy: "legacy",
      taxRate: input.taxRate,
      lineItems: internalLines,
      extraCosts: input.extraCosts,
      paymentMethod: input.paymentMethod,
      cccPercentage: input.cccPercentage,
    }),
    dealerPricing: calculateSalesFormSummary({
      strategy: "legacy",
      taxRate: input.taxRate,
      lineItems: dealerLines,
      extraCosts: input.extraCosts,
      paymentMethod: input.paymentMethod,
      cccPercentage: input.cccPercentage,
    }),
    lines: internalLines.map((internalLine, index) => {
      const dealerLine = dealerLines[index] || internalLine;

      return {
        uid: internalLine.uid,
        title: internalLine.title ?? null,
        qty: Number(internalLine.qty || 0),
        internalUnitPrice: Number(internalLine.unitPrice || 0),
        internalLineTotal: Number(internalLine.lineTotal || 0),
        dealerUnitPrice: Number(dealerLine.unitPrice || 0),
        dealerLineTotal: Number(dealerLine.lineTotal || 0),
      };
    }),
  };
}

export function buildDualSalesFormPricingSnapshot(
  input: DualPricingInput & {
    createdAt?: string | Date | null;
  },
): DualPricingSnapshot {
  const result = calculateDualSalesFormPricing(input);
  const createdAt =
    input.createdAt instanceof Date
      ? input.createdAt.toISOString()
      : input.createdAt || new Date().toISOString();

  return {
    ...result,
    source: "sales_form_dual_pricing",
    createdAt,
    profiles: {
      internal: {
        id: input.internalProfile?.id ?? null,
        label: input.internalProfile?.label ?? null,
        coefficient: coefficientValue(input.internalProfile),
      },
      dealer: {
        id: input.dealerProfile?.id ?? null,
        label: input.dealerProfile?.label ?? null,
        coefficient: coefficientValue(input.dealerProfile),
        salesPercentage: salesPercentageValue(input.dealerProfile),
      },
    },
  };
}
