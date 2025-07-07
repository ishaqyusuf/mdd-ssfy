"use client";

import Money from "@/components/_v1/money";
import { _useId } from "@/hooks/use-id";
import { useAppSelector } from "@/store";
import { ISalesOrder, ISalesOrderItem } from "@/types/sales";
import { useEffect, useState } from "react";

interface Props {
    order: ISalesOrder;
}
export function OrderPrintInvoiceLines({ order }: Props) {
    const po = useAppSelector((state) => state.slicers.printOrders);

    const [invoiceLines, setInvoiceLines] = useState<
        { sn?; id; line?: ISalesOrderItem | undefined }[]
    >([]);
    useEffect(() => {
        let _index = 0;

        const lineIndex = Math.max(
            ...(order?.items
                ?.map((item) => {
                    const li = item?.meta?.line_index;
                    const ui = item?.meta?.uid;
                    return ui > -1 ? ui : li;
                })
                .filter((i) => i > -1) as any)
        );
        const totalLines = lineIndex ? lineIndex + 1 : order?.items?.length;
        const ilines = Array(totalLines)
            .fill(null)
            .map((_, index) => {
                const item = order?.items?.find((iitem) => {
                    const li = iitem?.meta?.line_index;
                    const ui = iitem?.meta?.uid;
                    if (li > -1) return index == li;
                    return ui == index;
                });
                // const { qty = 0, total = 0 } = item;
                let qty = item?.qty || 0;
                let total = item?.total || 0;
                let sn: number | null = null;
                if (qty > 0 || total > 0) {
                    _index++;
                    sn = _index;
                }
                return {
                    sn,
                    id: _useId("inv"),
                    line: item,
                };
            });
        setInvoiceLines(ilines);
        // console.log(ilines);
    }, []);
    // invoiceLines.push({
    //   id: "filler",
    // });
    return (
        <>
            <thead id="header">
                <tr>
                    <th colSpan={1}>#</th>
                    <th className="" colSpan={8}>
                        Description
                    </th>
                    <th className="" colSpan={2}>
                        Swing
                    </th>
                    <th colSpan={1}>Qty</th>
                    {po?.packingList && <th colSpan={1}>Packed Qty</th>}
                    {po?.showInvoice && (
                        <>
                            <th colSpan={2} align="right">
                                Rate
                            </th>
                            <th colSpan={2}>Total</th>
                        </>
                    )}{" "}
                    {!po?.isClient && !po?.packingList && (
                        <th colSpan={4}>Supplier</th>
                    )}
                </tr>
            </thead>
            <tbody id="invoiceLines">
                {invoiceLines.map(({ id, sn, line }, index) => (
                    <tr
                        key={index}
                        id={id}
                        className={`
          ${invoiceLines.length == index + 1 && "border-b border-gray-500"}
          ${id == "fillter" && "hidden"}
          `}
                    >
                        <td colSpan={1} className="slim ">
                            <p className=" text-primary">{sn}</p>
                        </td>
                        <td colSpan={8}>
                            <LineDescription line={line} sn={sn} />
                        </td>
                        <td colSpan={2} valign="middle">
                            <p className="text-center font-semibold uppercase">
                                {line?.swing}
                            </p>
                        </td>
                        <td colSpan={1} align="center" valign="middle">
                            <p className="font-bold">{line?.qty}</p>
                        </td>
                        {po?.showInvoice && (
                            <>
                                <td colSpan={2} valign="middle" align="right">
                                    <Money
                                        validOnly
                                        className="pr-2 font-medium"
                                        value={line?.rate}
                                    />
                                </td>
                                <td colSpan={2} valign="middle" align="right">
                                    {
                                        <Money
                                            validOnly
                                            className="pr-2 font-medium"
                                            value={line?.total}
                                        />
                                    }
                                </td>
                            </>
                        )}
                        {!po?.isClient && !po?.packingList && (
                            <>
                                <td colSpan={4} valign="top" align="right">
                                    <p className="pr-2 uppercase">
                                        {line?.meta?.supplier}
                                    </p>
                                </td>
                            </>
                        )}
                        {po?.packingList && (
                            <td colSpan={1} align="center" valign="middle"></td>
                        )}
                    </tr>
                ))}
            </tbody>
        </>
    );
}
function LineDescription({
    line,
    sn,
}: {
    line: ISalesOrderItem | undefined;
    sn;
}) {
    if (sn == "filler") return <div id="filler" className="min-h-[20px]" />;
    if (!line?.description) return <div className="min-h-[20px]" />;

    return (
        <div className="flex text-sm">
            <div className="flex flex-1 flex-col">
                <div className="font-semibold">
                    {!sn && line.description ? (
                        <div
                            className={`-m-1 min-h-[20px] bg-gray-300 text-center text-primary uppercase`}
                        >
                            {line?.description?.trim()}
                        </div>
                    ) : (
                        <div className="uppercase  min-h-[20px]">
                            {line.description?.trim()}
                        </div>
                    )}
                </div>
                {/* {line?.meta?.components && (
            <div className="ml-6 pl-1">
              {line?.meta?.components.map((c, ic) => (
                <div key={ic}>
                  <span className="font-medium uppercase text-slate-500">
                    {c.type}
                  </span>
                </div>
              ))}
            </div>
          )} */}
            </div>
        </div>
    );
}
