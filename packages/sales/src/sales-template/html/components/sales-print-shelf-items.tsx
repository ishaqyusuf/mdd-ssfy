import { SalesInvoiceTemplateProps } from "../../types";

export function SalesPrintShelfItems({
  printData: sale,
  index,
}: SalesInvoiceTemplateProps & { index: number }) {
  // const { sale } = printData;
  const shelf = sale.orderedPrinting?.[index]?.shelf;
  if (!shelf) return null;
  if (!sale.shelfItemsTable) return null;

  return (
    <div className="my-4">
      <div className="table-fixed w-full border">
        <div className="flex">
          <p className="p-2 text-start uppercase text-base bg-slate-200">
            Shelf Items
          </p>
        </div>

        {/* Header row for shelf cells */}
        <div className="flex">
          {shelf?.cells?.map((cell: any, i: number) => (
            <div key={i} className="border px-2 flex-1">
              <p {...cell.style}>{cell.title}</p>
            </div>
          ))}
        </div>

        {/* Data rows for shelf items */}
        {shelf?._shelfItems?.map((cells: any, i: number) => (
          <div key={i} className="flex">
            {cells.map((cel: any, i: number) => (
              <div key={`a-${i}`} className="border px-2 flex-1">
                <p {...cel.style}>{cel.value}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
