import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFViewer,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 40,
  },
  header: {
    marginBottom: 20,
  },
  companyName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  companyDetails: {
    fontSize: 10,
    color: "#666",
  },
  invoiceTitle: {
    fontSize: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  invoiceDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  detailsColumn: {
    width: "48%",
  },
  label: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 3,
  },
  value: {
    fontSize: 10,
    marginBottom: 8,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 5,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  descCol: {
    width: "50%",
  },
  qtyCol: {
    width: "15%",
    textAlign: "right",
  },
  priceCol: {
    width: "17.5%",
    textAlign: "right",
  },
  totalCol: {
    width: "17.5%",
    textAlign: "right",
  },
  headerText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  cellText: {
    fontSize: 10,
  },
  totals: {
    marginTop: 20,
    alignSelf: "flex-end",
    width: "40%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  totalLabel: {
    fontSize: 10,
  },
  totalValue: {
    fontSize: 10,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: "#000",
    marginTop: 5,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
  },
  spacer: {
    flexGrow: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 15,
    marginTop: 20,
  },
  footerText: {
    fontSize: 9,
    color: "#666",
    marginBottom: 5,
    textAlign: "center",
  },
  footerBold: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
});

const invoiceData = {
  invoiceNumber: "INV-2024-001",
  invoiceDate: "2024-10-29",
  dueDate: "2024-11-28",
  billTo: {
    name: "Acme Corporation",
    address: "123 Business Street",
    city: "New York, NY 10001",
    email: "billing@acme.com",
  },
  billFrom: {
    name: "Your Company Inc.",
    address: "456 Supplier Avenue",
    city: "San Francisco, CA 94102",
    email: "invoices@yourcompany.com",
    phone: "+1 (555) 123-4567",
  },
  items: [
    { description: "Web Development Services", quantity: 40, price: 125.0 },
    { description: "UI/UX Design Consultation", quantity: 10, price: 150.0 },
    { description: "SEO Optimization Package", quantity: 1, price: 2500.0 },
    {
      description: "Monthly Hosting and Maintenance",
      quantity: 3,
      price: 299.99,
    },
  ],
};

const calculateSubtotal = (items) => {
  return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
};

export const InvoiceDocumentSample = async (props: any) => {
  const subtotal = calculateSubtotal(invoiceData.items);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{invoiceData.billFrom.name}</Text>
          <Text style={styles.companyDetails}>
            {invoiceData.billFrom.address}
          </Text>
          <Text style={styles.companyDetails}>{invoiceData.billFrom.city}</Text>
          <Text style={styles.companyDetails}>
            {invoiceData.billFrom.email}
          </Text>
          <Text style={styles.companyDetails}>
            {invoiceData.billFrom.phone}
          </Text>
        </View>

        <Text style={styles.invoiceTitle}>INVOICE</Text>

        <View style={styles.invoiceDetails}>
          <View style={styles.detailsColumn}>
            <Text style={styles.label}>Bill To:</Text>
            <Text style={styles.value}>{invoiceData.billTo.name}</Text>
            <Text style={styles.value}>{invoiceData.billTo.address}</Text>
            <Text style={styles.value}>{invoiceData.billTo.city}</Text>
            <Text style={styles.value}>{invoiceData.billTo.email}</Text>
          </View>
          <View style={styles.detailsColumn}>
            <Text style={styles.label}>Invoice Number:</Text>
            <Text style={styles.value}>{invoiceData.invoiceNumber}</Text>
            <Text style={styles.label}>Invoice Date:</Text>
            <Text style={styles.value}>{invoiceData.invoiceDate}</Text>
            <Text style={styles.label}>Due Date:</Text>
            <Text style={styles.value}>{invoiceData.dueDate}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.descCol]}>Description</Text>
            <Text style={[styles.headerText, styles.qtyCol]}>Qty</Text>
            <Text style={[styles.headerText, styles.priceCol]}>Price</Text>
            <Text style={[styles.headerText, styles.totalCol]}>Total</Text>
          </View>
          {[...invoiceData.items, ...invoiceData.items].map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.cellText, styles.descCol]}>
                {item.description}
              </Text>
              <Text style={[styles.cellText, styles.qtyCol]}>
                {item.quantity}
              </Text>
              <Text style={[styles.cellText, styles.priceCol]}>
                ${item.price.toFixed(2)}
              </Text>
              <Text style={[styles.cellText, styles.totalCol]}>
                ${(item.quantity * item.price).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (8%):</Text>
            <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.spacer} />

        <View style={styles.footer} wrap={false}>
          <Text style={styles.footerBold}>Payment Terms</Text>
          <Text style={styles.footerText}>
            Payment is due within 30 days of invoice date.
          </Text>
          <Text style={styles.footerText}>
            Please include invoice number with payment.
          </Text>
          <Text style={styles.footerText}>
            Bank transfers: Account #123456789 | Routing #987654321
          </Text>
          <Text style={styles.footerText} style={{ marginTop: 10 }}>
            Thank you for your business!
          </Text>
        </View>
      </Page>
    </Document>
  );
};

//   InvoiceDocument;
