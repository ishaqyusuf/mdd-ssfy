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
import { Template2 } from "./templates/template-2";

const templates: Record<string, SalesTemplateRenderer> = {
  "template-1": Template1,
  "template-2": Template2,
};

export function getTemplate(id: string): SalesTemplateRenderer {
  return templates[id] ?? templates["template-1"]!;
}
