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
  SignatureBlock,
} from "../blocks";

interface PackingSlipModeProps {
  page: PrintPage;
  baseUrl?: string;
  logoUrl?: string;
  companyAddress: CompanyAddress;
  config: SalesTemplateConfig;
}

/**
 * Packing slip mode: no prices, no footer.
 * Shows signature block + packing qty column.
 */
export function PackingSlipMode({
  page,
  baseUrl,
  logoUrl,
  companyAddress,
  config,
}: PackingSlipModeProps) {
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
        {page.sections.map((section) => {
          switch (section.kind) {
            case "door":
              return (
                <DoorBlock
                  key={`door-${section.index}`}
                  section={section}
                  baseUrl={baseUrl}
                  showImages={config.showImages}
                />
              );
            case "moulding":
              return (
                <MouldingBlock
                  key={`moulding-${section.index}`}
                  section={section}
                  baseUrl={baseUrl}
                  showImages={config.showImages}
                />
              );
            case "service":
              return (
                <ServiceBlock
                  key={`service-${section.index}`}
                  section={section}
                />
              );
            case "shelf":
              return (
                <ShelfBlock
                  key={`shelf-${section.index}`}
                  section={section}
                  baseUrl={baseUrl}
                  showImages={config.showImages}
                />
              );
            case "line-item":
              return (
                <LineItemBlock
                  key={`line-${section.index}`}
                  section={section}
                />
              );
          }
        })}
      </View>

      <View
        wrap={false}
        style={{
          ...cn(`border-x border-b border-t flex-col`),
          flex: 1,
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <SignatureBlock />
      </View>
    </>
  );
}
