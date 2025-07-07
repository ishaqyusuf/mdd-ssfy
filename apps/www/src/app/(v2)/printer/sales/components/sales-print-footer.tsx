"use client";

import { Icons } from "@/components/_v1/icons";
import { useSalesBlockCtx } from "../sales-print-block";
import Text from "../../components/print-text";
import React from "react";

export default function SalesPrintFooter() {
    const ctx = useSalesBlockCtx();
    const { sale } = ctx;
    if (!sale.footer) return null;

    const lines: NonNullable<(typeof sale.footer.lines)[number]>[] = sale.footer
        .lines as any;
    return (
        // <tfoot id="footer" className="">
        <tr className={`text-right font-bold`}>
            <td
                colSpan={10}
                valign="top"
                className={`border border-gray-400 p-4`}
            >
                <p className="mb-2 text-left text-xs font-normal italic text-red-600">
                    Note: Payments made with Cards will have an additional 3%
                    charge to cover credit cards merchants fees.
                </p>
                <div className="p-1">
                    <div>
                        {[
                            "1) NO RETURN ON SPECIAL ORDER",
                            "2) NO DAMAGED ORDER MAY BE EXCHANGE OR RETURN",
                            "3) ONCE SIGN THERE IS NO RETURN OR EXCHANGE.",
                        ].map((i, index) => (
                            <p
                                className="text-left text-xs text-red-600"
                                key={index}
                            >
                                {i}
                            </p>
                        ))}
                    </div>
                </div>
            </td>
            <td className="relative" colSpan={6}>
                <div>
                    <table className="h-full w-full">
                        {lines.map((line, index) => (
                            <tr className="border border-gray-400" key={index}>
                                <td
                                    className="bg-slate-200"
                                    align="left"
                                    colSpan={4}
                                >
                                    <Text
                                        {...line.style}
                                        className="whitespace-nowrap px-1 py-1.5"
                                    >
                                        {line.title}
                                    </Text>
                                </td>
                                <td className="py-1" colSpan={2}>
                                    <Text
                                        {...line.style}
                                        className="whitespace-nowrap px-1"
                                    >
                                        {line.value}
                                    </Text>
                                </td>
                            </tr>
                        ))}
                    </table>
                </div>
            </td>
        </tr>
        // </tfoot>
    );
}
