import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

// Styles
const styles = StyleSheet.create({
  page: {
    paddingTop: 80,
    paddingBottom: 80,
    paddingHorizontal: 40,
  },
  header: {
    position: "absolute",
    top: 20,
    left: 40,
    right: 40,
    fontSize: 14,
    borderBottomWidth: 1,
    paddingBottom: 5,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 10,
    textAlign: "center",
    color: "gray",
  },
  table: {
    // display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableColHeader: {
    width: "20%",
    borderStyle: "solid",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    backgroundColor: "#eee",
    padding: 4,
    fontSize: 10,
    fontWeight: 700,
  },
  tableCol: {
    width: "20%",
    borderStyle: "solid",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    padding: 4,
    fontSize: 10,
  },
  colDescription: {
    width: "40%",
    borderStyle: "solid",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    padding: 4,
    fontSize: 10,
  },
});

// Generate a row
const TableRow = ({ item }) => (
  <View style={styles.tableRow}>
    <Text style={styles.tableCol}>{item.qtyOrdered}</Text>
    <Text style={styles.tableCol}>{item.qtySheed}</Text>
    <Text style={styles.tableCol}>{item.uom}</Text>
    <Text style={styles.colDescription}>{item.description}</Text>
  </View>
);
const items = [
  {
    qtyOrdered: 10,
    qtySheed: 8,
    uom: "PCS",
    description: "Aluminium Frame - 2m",
  },
  // ...repeat or generate 50+ for pagination test
];
export const ExampleTemplate = ({}) => {
  // Fill page with empty rows if needed
  const rowsPerPage = 25;
  const paddedItems = [
    ...items,
    ...Array(Math.max(0, rowsPerPage - items.length)).fill({
      qtyOrdered: "",
      qtySheed: "",
      uom: "",
      description: "",
    }),
  ];

  const paginated: any[] = [];
  for (let i = 0; i < paddedItems.length; i += rowsPerPage) {
    paginated.push((paddedItems as any[]).slice(i, i + rowsPerPage));
  }

  return (
    <Document>
      {paginated.map((pageItems, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page} wrap>
          {/* Repeating Header */}
          <Text style={styles.header} fixed>
            INVOICE HEADER
          </Text>

          {/* Table */}
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableColHeader}>Qty Ordered</Text>
              <Text style={styles.tableColHeader}>Qty Sheed</Text>
              <Text style={styles.tableColHeader}>UOM</Text>
              <Text style={styles.tableColHeader}>Item Description</Text>
            </View>
            {(pageItems as any).map((item, index) => (
              <TableRow key={index} item={item} />
            ))}
          </View>

          {/* Footer only on last page */}
          {pageIndex === paginated.length - 1 && (
            <Text style={styles.footer} fixed>
              THANK YOU FOR YOUR BUSINESS
            </Text>
          )}
        </Page>
      ))}
    </Document>
  );
};
