import { SalesInvoiceTemplateProps } from "../../types";
import { cn } from "../../utils/cn";

export function SalesPrintFooter({
  printData: sale,
}: SalesInvoiceTemplateProps) {
  // const { sale } = printData;
  if (!sale.footer) return null;

  const lines: any[] = sale.footer.lines as any;

  return (
    <tfoot className="table-footer-group">
      <tr className="table-row">
        <td className="text-right font-bold flex w-full">
          <div className="border flex-col w-2/3 border-gray-400 p-2">
            <p className="col-span-2 text-left text-xs font-normal italic text-red-600">
              Note: Payments made with Cards will have an additional 3% charge
              to cover credit cards merchants fees.
            </p>

            <div className="p-1 flex-col">
              {[
                "1) NO RETURN ON SPECIAL ORDER",
                "2) NO DAMAGED ORDER MAY BE EXCHANGE OR RETURN",
                "3) ONCE SIGN THERE IS NO RETURN OR EXCHANGE.",
              ].map((i, index) => (
                <p className="text-left text-xs text-red-600" key={index}>
                  {i}
                </p>
              ))}
            </div>
          </div>

          <div className="relative w-1/3">
            <div className="w-full">
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="border border-gray-400 flex justify-between"
                >
                  <div className="bg-slate-200 flex-4 px-1 py-1.5">
                    <p className={cn(line.style)}>{line.title}</p>
                  </div>

                  <div className="flex-2 px-1 py-1">
                    <p className={cn(line.style)}>{line.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </td>
      </tr>
    </tfoot>
  );
}
