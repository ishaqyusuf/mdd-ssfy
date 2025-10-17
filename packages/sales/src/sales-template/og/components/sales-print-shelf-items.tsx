import { SalesInvoiceTemplateProps } from "../../types";

export function SalesPrintShelfItems({
  printData,
  index,
}: SalesInvoiceTemplateProps & { index: number }) {
  let sale = printData;
  const shelf = sale.orderedPrinting?.[index]?.shelf;
  if (!shelf) return null;
  if (!sale.shelfItemsTable) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        margin: "10px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          backgroundColor: "#333",
          padding: "8px",
          textTransform: "uppercase",
          fontSize: "20px",
          color: "white",
        }}
      >
        Shelf Items
      </div>

      <div style={{ display: "flex", border: "1px solid #555" }}>
        {shelf?.cells?.map((cell: any, i: number) => (
          <span
            key={i}
            style={{
              flex: 1,
              padding: "5px",
              fontWeight: "bold",
              color: "white",
              textAlign: "center",
            }}
          >
            {cell.title}
          </span>
        ))}
      </div>

      {shelf?._shelfItems?.map((cells: any, i: number) => (
        <div
          key={i}
          style={{
            display: "flex",
            border: "1px solid #555",
            borderTop: "none",
          }}
        >
          {cells.map((cel: any, i: number) => (
            <span
              key={`a-${i}`}
              style={{
                flex: 1,
                padding: "5px",
                color: "white",
                textAlign: "center",
              }}
            >
              {cel.value}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
