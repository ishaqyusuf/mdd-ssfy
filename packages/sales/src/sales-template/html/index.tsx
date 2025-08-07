import { cn } from "../utils/cn";
import { SalesPrintHeader } from "./components/sales-print-header";
import { SalesPrintLineItems } from "./components/sales-print-line-items";
import { SalesPrintShelfItems } from "./components/sales-print-shelf-items";
import { SalesPrintDoorItems } from "./components/sales-print-door-items";
import { SalesPrintFooter } from "./components/sales-print-footer";
import { PrintData } from "../../types";
import { SalesPrintSection } from "./components/sales-print-section";

export interface TemplateProps {
  data: PrintData;
}
export function SalesInvoiceHtmlTemplate({ data }: { data: PrintData }) {
  return (
    <div className="font-monos" id={`salesPrinter`}>
      <section id={`s${data?.id}`} className={cn("")}>
        <table className="main mr-10s w-full text-xs font-monos">
          <SalesPrintHeader data={data} />
          <tbody className="">
            {data.linesSection.map((section, o) => (
              <SalesPrintSection section={section} data={data} key={o} />
            ))}
          </tbody>
          {/* {sale?.order?.id && (
            <tbody>
              {sale?.orderedPrinting?.map((p, i) =>
                p.nonShelf ? (
                  <SalesPrintDoorItems
                    index={i}
                    key={"door" + i}
                    printData={printData}
                  />
                ) : (
                  <SalesPrintShelfItems
                    index={i}
                    key={"shelf" + i}
                    printData={printData}
                  />
                )
              )}
              <SalesPrintLineItems printData={printData} />
            </tbody>
          )}
          <SalesPrintFooter printData={printData} /> */}
        </table>
        {/* {sale.isPacking && (
          <div className="flex px-4 justify-between">
            {["Employee Sig. & Date", "Customer Sig. & Date"].map((s) => (
              <div key={s} className="w-1/4 italic text-sm font-semibold">
                <div className="border-b h-10 border-dashed border-muted-foreground"></div>
                <div className="m-1">{s}</div>
              </div>
            ))}
          </div>
        )} */}
      </section>
    </div>
  );
}
