import { cn } from "@gnd/ui/cn";
import { PrintData } from "../../../types";

interface Props {
  data: PrintData;
  section: PrintData["linesSection"][number];
}
export function SalesPrintSection({ data, section }: Props) {
  return (
    <tr className="uppercase">
      <td colSpan={16}>
        {!section?.title || (
          <div className="p-1 px-2 border mt-2 font-semibold bg-slate-200 text-start text-base uppercase">
            {section?.title}
          </div>
        )}
        {!section?.configurations?.length ? null : (
          <div className="grid border border-b-0 grid-cols-2">
            {section?.configurations
              .filter((d) => !!d.value)
              .filter((d) => !["Height"].includes(d.label))
              .map((detail, i) => (
                <div
                  key={i}
                  className="grid grid-cols-5 gap-2 border-b border-r"
                >
                  <div className="col-span-2 border-r  px-2 py-1 font-bold">
                    {detail.label}
                  </div>
                  <div className=" col-span-3 px-2 py-1">{detail.value}</div>
                </div>
              ))}
          </div>
        )}
        <table className="table-fixed w-full">
          <thead id="printHeader">
            <tr>
              {section?.tableHeader?.map((h) => (
                <th
                  className={cn("uppercase border p-1 font-bold")}
                  style={{
                    width: _width(h.width!),
                  }}
                >
                  {h?.text?.map((t) => <Render align={h.align}>{t}</Render>)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section?.tableRows.map((tr, tri) => (
              <tr key={tri}>
                {section?.tableHeader?.map((h) => (
                  <td
                    className={cn("uppercase border px-2")}
                    style={{
                      width: _width(h.width!),
                    }}
                  >
                    {tr?.[h?.text?.[0]!]?.text?.map((t) => (
                      <Render align={h.align}>{t}</Render>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  );
}
function _width(w: "sm" | "xs" | "lg" | "md") {
  return {
    sm: "100px",
    xs: "50px",
    md: "150px",
  }[w];
}
function Render({ children, align }) {
  return (
    <p
      className={cn(
        "text-start",
        align == "center" && "text-center",
        align == "end" && "text-right"
      )}
    >
      {children}
    </p>
  );
}
