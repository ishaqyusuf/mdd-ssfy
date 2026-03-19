import type { PrintMode, PrintModeConfig } from "./types";

export const modeConfigs: Record<PrintMode, Omit<PrintModeConfig, "mode">> = {
  invoice: {
    showPrices: true,
    showFooter: true,
    showPackingCol: false,
    showSignature: true,
    showImages: true,
  },
  quote: {
    showPrices: true,
    showFooter: true,
    showPackingCol: false,
    showSignature: true,
    showImages: true,
  },
  production: {
    showPrices: false,
    showFooter: false,
    showPackingCol: false,
    showSignature: false,
    showImages: true,
  },
  "packing-slip": {
    showPrices: false,
    showFooter: false,
    showPackingCol: true,
    showSignature: true,
    showImages: true,
  },
  "order-packing": {
    showPrices: true,
    showFooter: true,
    showPackingCol: false,
    showSignature: true,
    showImages: true,
  },
};

export function getModeConfig(mode: PrintMode): PrintModeConfig {
  return { mode, ...modeConfigs[mode] };
}

export const salesTaxes = [
  { code: "A", title: "County Tax", percentage: 1, on: "first 5000" },
  { code: "B", title: "Florida State Tax", percentage: 6, on: "total" },
] as const;

export type SalesTaxCode = (typeof salesTaxes)[number]["code"];

export const salesTaxByCode: Record<SalesTaxCode, (typeof salesTaxes)[number]> =
  {
    A: salesTaxes[0],
    B: salesTaxes[1],
  };
