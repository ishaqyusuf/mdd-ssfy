import type { PrintPage, CompanyAddress } from "@gnd/sales/print/types";

export interface SalesTemplateConfig {
  showImages: boolean;
}

export interface SalesTemplateRenderProps {
  page: PrintPage;
  baseUrl?: string;
  watermark?: string;
  logoUrl?: string;
  companyAddress: CompanyAddress;
  config: SalesTemplateConfig;
}

export type SalesTemplateRenderer = (
  props: SalesTemplateRenderProps,
) => JSX.Element;

// ─── Registry ──────────────────────────────────────────────

import { Template1 } from "./templates/template-1";

const templates: Record<string, SalesTemplateRenderer> = {
  "template-1": Template1,
};

export function getTemplate(id: string): SalesTemplateRenderer {
  return templates[id] ?? templates["template-1"]!;
}
