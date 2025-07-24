import { SalesInvoiceTemplateProps } from "../../types";

export function SalesPrintHeader({ printData }: SalesInvoiceTemplateProps) {
  let sale = printData || {};

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        marginBottom: "20px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: "24px", fontWeight: "bold", color: "white" }}>
          {sale?.header?.headerTitle}
        </span>
        {sale?.header?.heading?.lines?.map((h: any) => (
          <span key={h.title} style={{ fontSize: "18px", color: "#858585" }}>
            {h.title}: {h.value}
          </span>
        ))}
      </div>
      {sale?.header?.logoUrl && (
        <img
          src={sale.header.logoUrl}
          style={{
            width: "100px",
            height: "100px",
            objectFit: "contain",
          }}
        />
      )}
    </div>
  );
}
