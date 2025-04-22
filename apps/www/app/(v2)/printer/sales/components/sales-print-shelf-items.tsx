"use client";

import React from "react";
import { Icons } from "@/components/_v1/icons";

import Text from "../../components/print-text";
import { useSalesBlockCtx } from "../sales-print-block";

export default function SalesPrintShelfItems({ index }) {
    const ctx = useSalesBlockCtx();
    const { sale } = ctx;
    const shelf = ctx.sale.orderedPrinting?.[index]?.shelf;
    if (!shelf) return <></>;
    if (!sale.shelfItemsTable) return <></>;
    return (
        <tr className="">
            <td className="my-4" colSpan={16}>
                <table className="w-full table-fixed border">
                    <thead id="topHeader">
                        <th
                            className="bg-slate-200 p-2 text-start text-base uppercase"
                            colSpan={16}
                        >
                            Shelf Items
                        </th>
                    </thead>
                    <thead id="topHeader">
                        {shelf?.cells?.map((cell, i) => (
                            <th
                                className="border px-2"
                                key={i}
                                colSpan={cell.colSpan}
                            >
                                <Text {...cell.style}>{cell.title}</Text>
                            </th>
                        ))}
                    </thead>
                    <tbody>
                        {shelf?._shelfItems?.map((cells, i) => (
                            <tr key={i}>
                                {cells.map((cel, i) => (
                                    <td
                                        key={`a-${i}`}
                                        className="border px-2"
                                        colSpan={cel.colSpan}
                                    >
                                        <Text {...cel.style}>{cel.value}</Text>
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
