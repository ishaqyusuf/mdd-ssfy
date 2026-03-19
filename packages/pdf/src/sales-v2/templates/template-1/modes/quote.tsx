import { View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type { PrintPage, CompanyAddress } from "@gnd/sales/print/types";
import type { SalesTemplateConfig } from "../../../registry";
import {
  HeaderBlock,
  DoorBlock,
  MouldingBlock,
  ServiceBlock,
  ShelfBlock,
  LineItemBlock,
  ImageGalleryBlock,
  FooterBlock,
  SignatureBlock,
} from "../blocks";

interface QuoteModeProps {
  page: PrintPage;
  baseUrl?: string;
  logoUrl?: string;
  companyAddress: CompanyAddress;
  config: SalesTemplateConfig;
}

export function QuoteMode({
  page,
  baseUrl,
  logoUrl,
  companyAddress,
  config,
}: QuoteModeProps) {
  return (
    <>
      <View fixed style={cn(`pb-2 flex-col border-b`)}>
        <HeaderBlock
          meta={page.meta}
          billing={page.billing}
          shipping={page.shipping}
          companyAddress={companyAddress}
          baseUrl={baseUrl}
          logoUrl={logoUrl}
        />
      </View>

      <View style={cn(`w-full`)}>
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

        {config.showImages ? (
          <View style={page.sections.length > 0 ? { marginTop: 6 } : undefined}>
            <ImageGalleryBlock sections={page.sections} baseUrl={baseUrl} />
          </View>
        ) : null}
      </View>

      <View
        wrap={false}
        style={{
          ...cn(`border-x border-b border-t flex-col`),
          flex: 1,
          flexDirection: "column",
          justifyContent: "flex-end",
          borderColor: "#9ca3af",
        }}
      >
        <SignatureBlock />
        {page.footer && <FooterBlock footer={page.footer} />}
      </View>
    </>
  );
}
