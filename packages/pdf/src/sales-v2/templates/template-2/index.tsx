import type { SalesTemplateRenderProps } from "../../registry";
import { WatermarkPage } from "../../shared/watermark-page";
import {
  InvoiceMode,
  QuoteMode,
  ProductionMode,
  PackingSlipMode,
} from "./modes";

export function Template2(props: SalesTemplateRenderProps) {
  const { page, baseUrl, watermark, logoUrl, companyAddress, config } = props;
  const mode = page.config.mode;

  const modeProps = { page, baseUrl, logoUrl, companyAddress, config };

  return (
    <WatermarkPage
      wrap
      baseUrl={baseUrl}
      watermarkSrc={watermark}
      size="LETTER"
      style={{
        padding: 24,
        backgroundColor: "#ffffff",
        color: "#1e293b",
        fontFamily: "Inter",
      }}
    >
      {mode === "invoice" && <InvoiceMode {...modeProps} />}
      {mode === "quote" && <QuoteMode {...modeProps} />}
      {mode === "production" && <ProductionMode {...modeProps} />}
      {(mode === "packing-slip" || mode === "order-packing") && (
        <PackingSlipMode {...modeProps} />
      )}
    </WatermarkPage>
  );
}
