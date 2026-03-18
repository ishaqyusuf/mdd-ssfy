import { Document, Font } from "@react-pdf/renderer";
import type { PrintPage, CompanyAddress } from "@gnd/sales/print/types";
import { getTemplate, type SalesTemplateConfig } from "./registry";

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf",
      fontWeight: 500,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf",
      fontWeight: 700,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v19/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTc2dthjQ.ttf",
      fontWeight: 400,
      fontStyle: "italic",
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v19/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTc69thjQ.ttf",
      fontWeight: 500,
      fontStyle: "italic",
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v19/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTcB9xhjQ.ttf",
      fontWeight: 600,
      fontStyle: "italic",
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v19/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTcPtxhjQ.ttf",
      fontWeight: 700,
      fontStyle: "italic",
    },
  ],
});

interface SalesPdfDocumentProps {
  pages: PrintPage[];
  templateId?: string;
  baseUrl?: string;
  watermark?: string;
  logoUrl?: string;
  companyAddress: CompanyAddress;
  config?: Partial<SalesTemplateConfig>;
  title?: string;
  onRender?: Document["props"]["onRender"];
}

export function SalesPdfDocument({
  pages,
  templateId = "template-1",
  baseUrl,
  watermark,
  logoUrl,
  companyAddress,
  config,
  title,
  onRender,
}: SalesPdfDocumentProps) {
  const Template = getTemplate(templateId);
  const resolvedConfig: SalesTemplateConfig = {
    showImages: true,
    ...config,
  };

  return (
    <Document title={title} onRender={onRender}>
      {pages.map((page, i) => (
        <Template
          key={i}
          page={page}
          baseUrl={baseUrl}
          watermark={watermark}
          logoUrl={logoUrl}
          companyAddress={companyAddress}
          config={resolvedConfig}
        />
      ))}
    </Document>
  );
}
