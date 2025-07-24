import { SalesInvoiceTemplateProps } from "../../types";

export function SalesPrintDoorItems({
  printData,
  index,
}: SalesInvoiceTemplateProps & { index: number }) {
  const { orderedPrinting } = printData;
  const doors = orderedPrinting?.[index]?.nonShelf;
  if (!doors) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        marginBottom: "10px",
      }}
    >
      <span
        style={{
          fontSize: "20px",
          fontWeight: "bold",
          backgroundColor: "#333",
          padding: "8px",
          textTransform: "uppercase",
          color: "white",
        }}
      >
        {doors?.sectionTitle}
      </span>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {doors.details
          .filter(
            (d: any) => d.value && !["Height"].includes(d.step?.title as string)
          )
          .map((detail: any, i: number) => (
            <div
              key={i}
              style={{
                display: "flex",
                width: "50%",
                border: "1px solid #555",
                padding: "5px",
                boxSizing: "border-box",
              }}
            >
              <span style={{ fontWeight: "bold", marginRight: "5px" }}>
                {detail.step.title}:
              </span>
              <span>{detail.value}</span>
            </div>
          ))}
      </div>

      {doors.lines?.length ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "10px",
          }}
        >
          <div
            style={{ display: "flex", backgroundColor: "#444", padding: "5px" }}
          >
            {doors.itemCells.map((cell: any, i: number) => (
              <span
                key={i}
                style={{
                  flex: cell.colSpan,
                  fontWeight: "bold",
                  color: "white",
                  textAlign: "center",
                }}
              >
                {cell.title}
              </span>
            ))}
          </div>

          {doors.lines.map((line: any, i: number) => (
            <div
              key={i}
              style={{ display: "flex", borderBottom: "1px solid #555" }}
            >
              {line.map((ld: any, ldi: number) => (
                <span
                  key={ldi}
                  style={{
                    flex: ld.colSpan,
                    padding: "5px",
                    color: "white",
                    textAlign: "center",
                  }}
                >
                  {ld.value === "as-above" ? "✔" : ld.value}
                </span>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
