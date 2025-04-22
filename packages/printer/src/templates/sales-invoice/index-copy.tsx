import { Document, Page, Text, View } from "@react-pdf/renderer";

import { cn } from "../../style";
import { SalesInvoiceTemplateProps } from "../../types";
import SalesPrintDoorItems from "./components/sales-print-door-items";
import SalesPrintFooter from "./components/sales-print-footer";
import SalesPrintHeader from "./components/sales-print-header";
import SalesPrintLineItems from "./components/sales-print-line-items";
import SalesPrintShelfItems from "./components/sales-print-shelf-items";

export function SalesInvoicePdfTemplate(props: SalesInvoiceTemplateProps) {
  return (
    <Document>
      <Page
        size="A4"
        style={cn("p-4 bg-white text-black font-helvetica text-xs")}
      >
        <View>
          <Text>NOTHING TO DOWNLOAD</Text>
        </View>
      </Page>
    </Document>
  );
}
export function __SalesInvoicePdfTemplate(props: SalesInvoiceTemplateProps) {
  const { size = "a4", printData } = props;
  if (!printData)
    return (
      <Document>
        <Page
          size="A4"
          style={cn("p-4 bg-white text-black font-helvetica text-xs")}
        >
          <View>
            <Text>NOTHING TO DOWNLOAD</Text>
          </View>
        </Page>
      </Document>
    );
  const { orderedPrinting = [], order, isPacking } = printData?.sale || {};

  return (
    <Document>
      <Page
        size="A4"
        style={cn("p-4 bg-white text-black font-helvetica text-xs")}
      >
        <View>
          <SalesPrintHeader printData={printData} />
        </View>
        {order?.id && (
          <View style={cn("w-full border-red-600")}>
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
              ),
            )}

            <SalesPrintLineItems printData={printData} />
            <SalesPrintFooter printData={printData} />
          </View>
        )}

        {isPacking && (
          <View style={cn("flex-row px-4 justify-between mt-4")}>
            {["Employee Sig. & Date", "Customer Sig. & Date"].map((label) => (
              <View key={label} style={cn("w-1/4")}>
                <View
                  style={cn("border-b h-10 border-dashed border-gray-500")}
                />
                <Text style={cn("mt-1 italic font-semibold")}>{label}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
