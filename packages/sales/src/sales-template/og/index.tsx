import { SalesInvoiceTemplateProps } from "../../types";
import { SalesPrintDoorItems } from "./components/sales-print-door-items";
import { SalesPrintFooter } from "./components/sales-print-footer";
import { SalesPrintHeader } from "./components/sales-print-header";
import { SalesPrintLineItems } from "./components/sales-print-line-items";
import { SalesPrintShelfItems } from "./components/sales-print-shelf-items";

export function OgTemplate({ printData }: SalesInvoiceTemplateProps) {
  const { orderedPrinting = [], order, isPacking } = printData?.sale || {};

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0C0C0C",
        fontFamily: "GeistMono",
        padding: "16px",
      }}
    >
      <SalesPrintHeader printData={printData} />

      {order?.id && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
          }}
        >
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
        </div>
      )}

      {isPacking && (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            paddingLeft: "16px",
            paddingRight: "16px",
            justifyContent: "space-between",
            marginTop: "16px",
            color: "white",
          }}
        >
          {["Employee Sig. & Date", "Customer Sig. & Date"].map((label) => (
            <div key={label} style={{ width: "25%" }}>
              <div
                style={{
                  borderBottom: "1px dashed #9CA3AF",
                  height: "40px",
                }}
              />
              <span
                style={{
                  marginTop: "4px",
                  fontStyle: "italic",
                  fontWeight: "bold",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
