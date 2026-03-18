import { Document, Font, Page, Text, View } from "@react-pdf/renderer";
import QRCodeUtil from "qrcode";
import { cn } from "@gnd/utils/react-pdf";
import SalesPrintHeader from "../components/sales-print-header";
import SalesPrintDoorItems from "../components/sales-print-door-items";
import SalesPrintShelfItems from "../components/sales-print-shelf-items";
import SalesPrintLineItems from "../components/sales-print-line-items";
import SalesPrintFooter from "../components/sales-print-footer";
import WatermarkPage from "../components/watermark-page";
import { ComponentProps } from "react";
// import { QRCode } from "../components/qr-code";
// import { Info } from ".../.../generate-print-data";
// import { DataCell } from "../components/data-cell";
// import { Header } from "../components/header";

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
    // Italic fonts
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
interface Props {
  pages: any[];

  // url;
  watermark?;
  title?;
  template: {
    logoUrl?: string;
    size: "LETTER" | "A4";
  };
  baseUrl?;
  onRender?: Document["props"]["onRender"];
}
export function SalesPdfTemplate(props: Props) {
  const { template } = props;
  return (
    <Document onRender={props.onRender} title={props.title}>
      {props.pages.map((printData, ui) => {
        const { orderedPrinting = [], order, isPacking } = printData || {};
        const mode = printData?.mode;

        const showCustomerSignatureSection =
          mode === "packing list" ||
          mode == "order-packing" ||
          mode === "order" ||
          mode === "quote" ||
          isPacking ||
          printData?.isOrder ||
          printData?.isEstimate;
        return (
          <WatermarkPage
            key={ui}
            wrap
            baseUrl={props.baseUrl}
            watermarkSrc={props.watermark}
            size={template.size.toUpperCase() as "LETTER" | "A4"}
            style={{
              padding: 20,
              backgroundColor: "#fff",
              color: "#000",
              fontFamily: "Inter",
              // fontWeight: 400,
            }}
          >
            <View fixed style={cn("pb-2 flex-col border-b")}>
              <SalesPrintHeader baseUrl={props.baseUrl} printData={printData} />
            </View>
            {order?.id && (
              <>
                <View style={cn("w-full")}>
                  {orderedPrinting.map((p: any, i: number) =>
                    p.nonShelf ? (
                      <SalesPrintDoorItems
                        key={`door${i}`}
                        index={i}
                        baseUrl={props.baseUrl}
                        printData={printData}
                      />
                    ) : (
                      <SalesPrintShelfItems
                        key={`shelf${i}`}
                        index={i}
                        printData={printData}
                      />
                    ),
                  )}
                  {/* <Text>{JSON.stringify(printData)}</Text> */}
                  <SalesPrintLineItems printData={printData} />
                </View>
              </>
            )}

            <View
              wrap={false}
              style={cn("border-x border-b border-t flex-col", {
                flex: 1,
                flexDirection: "column",
                justifyContent: "flex-end",
              })}
            >
              {showCustomerSignatureSection && (
                <View wrap={false} style={cn("px-4 mt-4 mb-2")}>
                  <View style={cn("flex-row justify-between")}>
                    <View style={{ width: "70%" }}>
                      <View style={cn("border-b h-10 border-dashed")} />
                      <Text style={cn("mt-1 text-sm italic font-semibold")}>
                        Customer Signature & date
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              <SalesPrintFooter printData={printData} />
            </View>
          </WatermarkPage>
        );
      })}
    </Document>
  );
}
