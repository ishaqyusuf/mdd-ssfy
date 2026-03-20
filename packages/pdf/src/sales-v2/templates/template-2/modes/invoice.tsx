import { View } from "@react-pdf/renderer";
import type { PrintPage, CompanyAddress } from "@gnd/sales/print/types";
import type { SalesTemplateConfig } from "../../../registry";
import {
  HeaderBlock,
  DoorBlock,
  MouldingBlock,
  ServiceBlock,
  ShelfBlock,
  LineItemBlock,
  FooterBlock,
  SignatureBlock,
} from "../blocks";

interface InvoiceModeProps {
  page: PrintPage;
  baseUrl?: string;
  logoUrl?: string;
  companyAddress: CompanyAddress;
  config: SalesTemplateConfig;
}

export function InvoiceMode({
  page,
  baseUrl,
  logoUrl,
  companyAddress,
  config,
}: InvoiceModeProps) {
  return (
    <>
      <View fixed style={{ paddingBottom: 8, marginBottom: 8 }}>
        <HeaderBlock
          meta={page.meta}
          billing={page.billing}
          shipping={page.shipping}
          companyAddress={companyAddress}
          baseUrl={baseUrl}
          logoUrl={logoUrl}
        />
      </View>

      <View style={{ width: "100%" }}>
        {page.sections.map((section, index) => {
          const wrapperStyle = index === 0 ? undefined : { marginTop: 6 };
          switch (section.kind) {
            case "door":
              return (
                <View key={`door-${section.index}`} style={wrapperStyle}>
                  <DoorBlock
                    section={section}
                    baseUrl={baseUrl}
                    showImages={config.showImages}
                  />
                </View>
              );
            case "moulding":
              return (
                <View key={`moulding-${section.index}`} style={wrapperStyle}>
                  <MouldingBlock
                    section={section}
                    baseUrl={baseUrl}
                    showImages={config.showImages}
                  />
                </View>
              );
            case "service":
              return (
                <View key={`service-${section.index}`} style={wrapperStyle}>
                  <ServiceBlock section={section} />
                </View>
              );
            case "shelf":
              return (
                <View key={`shelf-${section.index}`} style={wrapperStyle}>
                  <ShelfBlock
                    section={section}
                    baseUrl={baseUrl}
                    showImages={config.showImages}
                  />
                </View>
              );
            case "line-item":
              return (
                <View key={`line-${section.index}`} style={wrapperStyle}>
                  <LineItemBlock section={section} />
                </View>
              );
          }
        })}
      </View>

      <View
        wrap={false}
        style={{
          flex: 1,
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <SignatureBlock />
        {page.footer && <FooterBlock footer={page.footer} />}
      </View>
    </>
  );
}
