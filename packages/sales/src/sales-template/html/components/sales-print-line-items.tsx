import { SalesInvoiceTemplateProps } from "../../types";
import { cn } from "../../utils/cn";

export function SalesPrintLineItems({
  printData: sale,
}: SalesInvoiceTemplateProps) {
  // const { sale } = printData;
  if (!sale.lineItems) return null;

  return (
    <div className="uppercase">
      <div className="w-full">
        <div className="flex border border-gray-400 bg-slate-100">
          {sale.lineItems.heading.map((col: any) => (
            <div
              key={col.title}
              className="border border-gray-400 uppercase p-0.5 flex-1"
            >
              <p>{col.title}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          {sale.lineItems.lines.map((line: any) => (
            <div
              key={line.id}
              className={cn(!line.total && "bg-slate-200", "flex")}
            >
              {line.cells.map((cell: any, i: number) => (
                <div
                  key={i}
                  className="border border-gray-400 uppercase flex-1"
                >
                  <p className="p-0.5" {...cell.style}>
                    {cell.title}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
