import { Document, Page, Text, View } from "@react-pdf/renderer";
import { SalesInvoiceTemplateProps } from "../../types";
import { SalesPrintDoorItems } from "./components/sales-print-door-items";
import { SalesPrintFooter } from "./components/sales-print-footer";
import { SalesPrintHeader } from "./components/sales-print-header";
import { SalesPrintLineItems } from "./components/sales-print-line-items";
import { SalesPrintShelfItems } from "./components/sales-print-shelf-items";

export function PdfTemplate({ printData }: SalesInvoiceTemplateProps) {
  const { orderedPrinting = [], order, isPacking } = printData?.sale || {};

  return (
    <Document>
      <Page
        size="A4"
        style={{
          padding: 20,
          backgroundColor: "#fff",
          color: "#000",
          fontFamily: "Helvetica",
        }}
      >
        <View style={{ marginBottom: 20, flexDirection: "column" }}>
          <SalesPrintHeader printData={printData} />
        </View>
        {order?.id && (
          <View style={{ width: "100%" }}>
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
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 16,
              justifyContent: "space-between",
              marginTop: 16,
            }}
          >
            {["Employee Sig. & Date", "Customer Sig. & Date"].map((label) => (
              <View key={label} style={{ width: "25%" }}>
                <View
                  style={{
                    borderBottomWidth: 1,
                    height: 40,
                    borderStyle: "dashed",
                    borderColor: "#9CA3AF",
                  }}
                />
                <Text
                  style={{
                    marginTop: 4,
                    fontStyle: "italic",
                    fontWeight: 700,
                  }}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
