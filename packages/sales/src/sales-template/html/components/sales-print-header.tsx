import { TemplateProps } from "..";
import { cn } from "../../utils/cn";

export function SalesPrintHeader({ data }: TemplateProps) {
  return (
    <thead id="topHeader" className="table-header-group">
      <tr className="table-row">
        <th align="center" className="w-1/3 align-top text-left">
          <div className="">
            <img width={178} height={80} src={"/logo.png"} />
          </div>
        </th>
        <th className="w-1/4 align-top text-left font-bold">
          {/* Company Address */}
          <p className="text-sm font-mono$">13285 SW 131 ST</p>
          <p className="text-sm font-mono$">Miami, Fl 33186</p>
          <p className="text-sm font-mono$">Phone: 305-278-6555</p>
          {data.query?.mode == "production" && (
            <p className="text-sm font-mono$">Fax: 305-278-2003</p>
          )}
          <p className="text-sm font-mono$">support@gndmillwork.com</p>
        </th>
        <th className="w-1/3 align-top text-right p-2">
          {/* Heading */}
          <h2 className="text-xl mb-2 capitalize font-bold">
            {data.meta?.title}
          </h2>
          <div className="flex flex-col gap-1">
            {data.meta.details.map((line, i) => (
              <div key={i} className="flex items-end justify-between">
                <span className="font-bold">{line.label}</span>
                <span className={cn("font-medium text-sm")} style={line.style}>
                  {line.value}
                </span>
              </div>
            ))}
          </div>
        </th>
      </tr>
      <tr className="table-row">
        {data?.billing && (
          <td className="w-1/3 align-top">
            <div className="text-sm bg-slate-200 text-gray-700 border p-1 uppercase px-2 font-bold">
              Bill To
            </div>
            <div className="border p-2 flex flex-col">
              {data?.billing?.map((line: string, idx: number) => (
                <p key={idx} className="text-sm">
                  {line}
                </p>
              ))}
            </div>
          </td>
        )}
        <td className="w-1/4 align-top relative">
          {/* {sale?.isPacking && sale?.paymentDate && (
            <div className="absolute top-[-20px] left-[40px] transform -rotate-45 text-[72px] leading-none font-bold text-red-300 text-center">
              <p className="text-5xl font-bold">Paid</p>
              <p className="text-2xl leading-8">{sale.paymentDate}</p>
            </div>
          )} */}
        </td>
        {data?.shipping && (
          <td className="w-1/3 align-top">
            <div className="text-sm  uppercase bg-slate-200 text-gray-700 border p-1 px-2 font-bold">
              Ship To
            </div>
            <div className="border p-2 flex flex-col">
              {data?.shipping?.map((line: string, idx: number) => (
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
