import { Document, Page, Text, View } from "@react-pdf/renderer";

import { SalesInvoiceTemplateProps } from "../../types";
import { SalesPrintHeader } from "./components/sales-print-header";

export function SalesInvoicePdfTemplate(props: SalesInvoiceTemplateProps) {
  const { size = "a4" } = props;
  return null;
  return (
    <Document>
      <Page
        wrap
        size={size.toUpperCase() as "LETTER" | "A4"}
        style={{
          padding: 20,
          backgroundColor: "#fff",
          color: "#000",
          fontFamily: "Helvetica",
        }}
      >
        <SalesPrintHeader {...props} />
        {/* <Text style={{ color: "red" }}>HELLO PDF</Text> */}
        <View
          style={{
            flexDirection: "row",
          }}
        ></View>
      </Page>
    </Document>
  );
}
