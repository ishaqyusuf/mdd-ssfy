import React from "react";
import { SalesPrintData, SalesInvoiceTemplateProps } from "../types";
import { cn } from "../utils/cn";
import { SalesPrintHeader } from "./components/sales-print-header";
import { SalesPrintLineItems } from "./components/sales-print-line-items";
import { SalesPrintShelfItems } from "./components/sales-print-shelf-items";
import { SalesPrintDoorItems } from "./components/sales-print-door-items";
import { SalesPrintFooter } from "./components/sales-print-footer";

export function HtmlTemplate({ printData }: SalesInvoiceTemplateProps) {
  // const { sale } = printData;
  let sale = printData;
  if (!sale) {
    return null;
  }

  return (
    <div className="" id={`salesPrinter`}>
      <section id={`s${sale.order?.id}`} className={cn("")}>
        <table className="main mr-10s w-full text-xs table-fixed">
          <SalesPrintHeader printData={printData} />
          {sale?.order?.id && (
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
          <SalesPrintFooter printData={printData} />
        </table>
        {sale.isPacking && (
          <div className="flex px-4 justify-between">
            {["Employee Sig. & Date", "Customer Sig. & Date"].map((s) => (
              <div key={s} className="w-1/4 italic text-sm font-semibold">
                <div className="border-b h-10 border-dashed border-muted-foreground"></div>
                <div className="m-1">{s}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
