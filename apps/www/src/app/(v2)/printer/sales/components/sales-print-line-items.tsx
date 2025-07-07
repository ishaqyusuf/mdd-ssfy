"use client";

import { Icons } from "@/components/_v1/icons";
import { useSalesBlockCtx } from "../sales-print-block";
import Text from "../../components/print-text";
import React from "react";
import { cn } from "@/lib/utils";

export default function SalesPrintLineItems() {
    const ctx = useSalesBlockCtx();
    const { sale } = ctx;
    if (!sale.lineItems) return null;
    return (
        <tr className="uppercase">
            <td colSpan={16}>
                <table className="table-fixed w-full">
                    <thead id="header">
                        <tr className="border bg-slate-100">
                            {sale.lineItems.heading.map((col) => (
                                <th
                                    className="border uppercase p-0.5"
                                    key={col.title}
                                    colSpan={col.colSpan}
                                >
                                    {col.title}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody id="invoiceLines">
                        {sale.lineItems.lines.map((line) => (
                            <tr
                                key={line.id}
                                className={cn(!line.total && "bg-slate-200")}
                            >
                                {line.cells.map((cell, i) => (
                                    <td
                                        className="border uppercase"
                                        colSpan={cell.style.colSpan}
                                        key={i}
                                    >
                                        <Text className="p-0.5" {...cell.style}>
                                            {cell.title}
                                        </Text>
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
