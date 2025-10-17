import { SalesInvoiceTemplateProps } from "../../types";

export function SalesPrintFooter({ printData }: SalesInvoiceTemplateProps) {
  // const { sale } = printData;
  let sale = printData;
  if (!sale.footer) return null;

  const lines: any[] = sale.footer.lines as any;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        marginTop: "20px",
        color: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          border: "1px solid #555",
          padding: "10px",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{ fontSize: "14px", fontStyle: "italic", color: "#FF0000" }}
        >
          Note: Payments made with Cards will have an additional 3% charge to
          cover credit cards merchants fees.
        </span>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "10px",
          }}
        >
          {[
            "1) NO RETURN ON SPECIAL ORDER",
            "2) NO DAMAGED ORDER MAY BE EXCHANGE OR RETURN",
            "3) ONCE SIGN THERE IS NO RETURN OR EXCHANGE.",
          ].map((i, index) => (
            <span key={index} style={{ fontSize: "14px", color: "#FF0000" }}>
              {i}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          marginTop: "10px",
        }}
      >
        {lines.map((line, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: "space-between",
              border: "1px solid #555",
              borderBottom:
                index === lines.length - 1 ? "1px solid #555" : "none",
              padding: "8px",
              backgroundColor: "#222",
            }}
          >
            <span style={{ fontWeight: "bold" }}>{line.title}</span>
            <span>{line.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
