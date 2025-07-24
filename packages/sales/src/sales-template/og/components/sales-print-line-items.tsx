import { SalesInvoiceTemplateProps } from "../../types";

export function SalesPrintLineItems({ printData }: SalesInvoiceTemplateProps) {
  let sale = printData;
  if (!sale.lineItems) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        marginTop: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          backgroundColor: "#333",
          border: "1px solid #555",
          padding: "5px",
          textTransform: "uppercase",
          color: "white",
        }}
      >
        {sale.lineItems.heading.map((col: any) => (
          <span key={col.title} style={{ flex: 1, textAlign: "center" }}>
            {col.title}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {sale.lineItems.lines.map((line: any) => (
          <div
            key={line.id}
            style={{
              display: "flex",
              backgroundColor: line.total ? "#222" : "#111",
              border: "1px solid #555",
              borderTop: "none",
            }}
          >
            {line.cells.map((cell: any, i: number) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  padding: "5px",
                  textTransform: "uppercase",
                  color: "white",
                  textAlign: cell.style?.position || "left",
                }}
              >
                {cell.title}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
