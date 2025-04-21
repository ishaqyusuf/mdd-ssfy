import { Document, Page } from "@react-pdf/renderer";

import { SalesInvoiceTemplateProps } from "../../types";

export async function SalesInvoicePdfTemplate({
  size = "a4",
}: SalesInvoiceTemplateProps) {
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
      ></Page>
    </Document>
  );
}
