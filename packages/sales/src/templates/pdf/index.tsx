import { Document, Font, Page, Text, View } from "@react-pdf/renderer";
import QRCodeUtil from "qrcode";
import { QRCode } from "./components/qr-code";
import { cn } from "@gnd/utils/react-email";
import SalesPrintHeader from "./components/sales-print-header";
import SalesPrintDoorItems from "./components/sales-print-door-items";
import SalesPrintShelfItems from "./components/sales-print-shelf-items";
import SalesPrintLineItems from "./components/sales-print-line-items";
import SalesPrintFooter from "./components/sales-print-footer";

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
  template: {
    logoUrl?: string;
    size: "LETTER" | "A4";
  };
}
export async function PdfTemplate(props: Props) {
  const { template } = props;
  let qrCode: any = null;

  //   if (template.includeQr) {
  qrCode = await QRCodeUtil.toDataURL(
    `https://gndprodesk.com/api/model-template?preview=true&slugs=`,
    // props.url,
    {
      margin: 0,
      width: 40 * 3,
    }
  );
  //   }

  return (
    <Document>
      {props.pages.map((printData, ui) => {
        // const { orderedPrinting = [], order, isPacking } = printData || {};
        return (
          <Page
            key={ui}
            wrap
            size={template.size.toUpperCase() as "LETTER" | "A4"}
            style={{
              padding: 20,
              backgroundColor: "#fff",
              color: "#000",
              // fontFamily: "Inter",
              // fontWeight: 400,
            }}
          >
            <View style={cn("mb-2 flex-col")}>
              {/* <SalesPrintHeader printData={printData} /> */}
            </View>
            {/* {order?.id && (
              <View style={cn("w-full border")}>
                {orderedPrinting.map((p: any, i: number) =>
                  p.nonShelf ? (
                    <SalesPrintDoorItems
                      key={`door${i}`}
                      index={i}
                      printData={printData}
                    />
                  ) : (
                    <SalesPrintShelfItems
                      key={`shelf${i}`}
                      index={i}
                      printData={printData}
                    />
                  )
                )}

                <SalesPrintLineItems printData={printData} />
                <SalesPrintFooter printData={printData} />
              </View>
            )}

            {isPacking && (
              <View style={cn("flex-row px-4 justify-between mt-4")}>
                {["Employee Sig. & Date", "Customer Sig. & Date"].map(
                  (label) => (
                    <View key={label} style={cn("w-1/4")}>
                      <View
                        style={cn(
                          "border-b h-10 border-dashed border-gray-500"
                        )}
                      />
                      <Text style={cn("mt-1 italic font-semibold")}>
                        {label}
                      </Text>
                    </View>
                  )
                )}
              </View>
            )} */}
          </Page>
        );
      })}
    </Document>
  );
}
