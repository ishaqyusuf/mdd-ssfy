import { SalesInvoiceTemplateProps } from "../../types";
import { cn } from "../../utils/cn";

export function SalesPrintDoorItems({
  printData: sale,
  index,
}: SalesInvoiceTemplateProps & { index: number }) {
  const { orderedPrinting } = sale;
  const doors = orderedPrinting?.[index]?.nonShelf;
  if (!doors) return null;

  return (
    <div className="flex flex-col">
      <h3 className="text-sm p-2 uppercase bg-slate-200 border font-bold">
        {doors?.sectionTitle}
      </h3>

      <div className="flex flex-wrap">
        {doors.details
          .filter(
            (d: any) => d.value && !["Height"].includes(d.step?.title as string)
          )
          .map((detail: any, i: number) => (
            <div key={i} className="border border-red-400 w-1/2 flex">
              <div className="p-1 w-1/3 border-r font-bold">
                <p>{detail.step.title}</p>
              </div>
              <div className="p-1 w-2/3 px-4">
                <p>{detail.value}</p>
              </div>
            </div>
          ))}
      </div>

      {doors.lines?.length ? (
        <div className="flex flex-col">
          <div className="flex">
            {doors.itemCells.map((cell: any, i: number) => (
              <div
                key={i}
                className={cn("border px-4 py-2", `flex-${cell.colSpan}`)}
              >
                <p>{cell.title}</p>
              </div>
            ))}
          </div>

          {doors.lines.map((line: any, i: number) => (
            <div key={i} className="flex">
              {line.map((ld: any, ldi: number) => (
                <div
                  key={ldi}
                  className={cn("border px-4 py-2", `flex-${ld.colSpan}`)}
                >
                  {ld.value === "as-above" ? (
                    <p className="text-center">✔</p>
                  ) : Array.isArray(ld.value) ? (
                    ld.value.map((val: any, vi: number) => (
                      <p key={vi}>{val}</p>
                    ))
                  ) : (
                    <p>{ld.value}</p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
