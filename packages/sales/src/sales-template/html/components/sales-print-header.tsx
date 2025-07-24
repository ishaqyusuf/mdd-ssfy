import { SalesInvoiceTemplateProps } from "../../types";
import { cn } from "../../utils/cn";

export function SalesPrintHeader({
  printData: sale = {} as any,
}: SalesInvoiceTemplateProps) {
  // const { sale } = printData || {};

  return (
    <thead className="table-header-group">
      <tr className="table-row">
        <th className="w-1/3 align-top text-left">
          {/* Company Logo */}
          {/* {sale?.header?.logoUrl && (
            <img
              src={sale.header.logoUrl}
              alt="Company Logo"
              className="w-[150px] h-[150px] object-contain"
            />
          )} */}
        </th>
        <th className="w-1/4 align-top text-left font-bold">
          {/* Company Address */}
          <p className="text-sm font-mono">13285 SW 131 ST</p>
          <p className="text-sm font-mono">Miami, Fl 33186</p>
          <p className="text-sm font-mono">Phone: 305-278-6555</p>
          {sale?.isProd && (
            <p className="text-sm font-mono">Fax: 305-278-2003</p>
          )}
          <p className="text-sm font-mono">support@gndmillwork.com</p>
        </th>
        <th className="w-1/3 align-top text-right p-2">
          {/* Heading */}
          <h2 className="text-lg font-bold">{sale?.headerTitle}</h2>
          {sale?.heading?.lines?.map((h: any) => (
            <div key={h.title} className="flex justify-between">
              <span className="font-bold">{h.title}</span>
              <span className={cn(h.style)}>{h.value}</span>
            </div>
          ))}
        </th>
      </tr>
      <tr className="table-row">
        {sale?.address?.[0] && (
          <td className="w-1/3 align-top">
            <div className="text-sm bg-slate-200 text-gray-700 border p-1 px-2 font-bold">
              {sale.address[0].title}
            </div>
            <div className="border p-2 flex flex-col">
              {sale.address[0].lines?.map((line: string, idx: number) => (
                <p key={idx} className="text-sm">
                  {line}
                </p>
              ))}
            </div>
          </td>
        )}
        <td className="w-1/4 align-top relative">
          {sale?.isPacking && sale?.paymentDate && (
            <div className="absolute top-[-20px] left-[40px] transform -rotate-45 text-[72px] leading-none font-bold text-red-300 text-center">
              <p className="text-5xl font-bold">Paid</p>
              <p className="text-2xl leading-8">{sale.paymentDate}</p>
            </div>
          )}
        </td>
        {sale?.address?.[1] && (
          <td className="w-1/3 align-top">
            <div className="text-sm bg-slate-200 text-gray-700 border p-1 px-2 font-bold">
              {sale.address[1].title}
            </div>
            <div className="border p-2 flex flex-col">
              {sale.address[1].lines?.map((line: string, idx: number) => (
                <p key={idx} className="text-sm">
                  {line}
                </p>
              ))}
            </div>
          </td>
        )}
      </tr>
    </thead>
  );
}
