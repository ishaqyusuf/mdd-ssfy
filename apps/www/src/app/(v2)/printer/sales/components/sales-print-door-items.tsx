"use client";

import React from "react";
import { Icons } from "@/components/_v1/icons";

import Text from "../../components/print-text";
import { useSalesBlockCtx } from "../sales-print-block";

export default function SalesPrintDoorItems({ index }) {
    const ctx = useSalesBlockCtx();
    const { sale } = ctx;
    const doors = ctx.sale.orderedPrinting?.[index]?.nonShelf;
    if (!doors) return <></>;

    return (
        <tr className="uppercase">
            <td colSpan={16} className="">
                {/* {sale.doorsTable.doors.map((dt, index) => ( */}
                <table className="w-full table-fixed border">
                    <thead id="topHeader">
                        <tr>
                            <th
                                className="p-1s bg-slate-200 text-start text-base uppercase"
                                colSpan={16}
                            >
                                {doors?.sectionTitle}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="">
                        <tr>
                            <td colSpan={16}>
                                <div className="grid grid-cols-2">
                                    {doors.details
                                        .filter((d) => d.value)
                                        .filter(
                                            (d) =>
                                                !["Height"].includes(
                                                    d.step?.title as any,
                                                ),
                                        )
                                        .map((detail, i) => (
                                            <div
                                                key={i}
                                                className="grid grid-cols-5 gap-2 border-b  border-r"
                                            >
                                                <div className="col-span-2 border-r  px-2 py-1 font-bold">
                                                    {detail.step.title}
                                                </div>
                                                <div className=" col-span-3 px-2 py-1">
                                                    {detail.value}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </td>
                        </tr>
                        {doors.lines?.length ? (
                            <tr>
                                <td colSpan={16}>
                                    <table className="printly w-full table-fixed">
                                        <thead className="">
                                            <tr>
                                                {doors.itemCells.map(
                                                    (cell, i) => (
                                                        <th
                                                            key={i}
                                                            className="border px-2"
                                                            colSpan={
                                                                cell.colSpan
                                                            }
                                                        >
                                                            <Text
                                                                {...cell.style}
                                                            >
                                                                {cell.title}
                                                            </Text>
                                                        </th>
                                                    ),
                                                )}
                                            </tr>
                                        </thead>
                                        {doors.lines?.map((line, i) => (
                                            <tr key={i}>
                                                {line.map((ld, ldi) => (
                                                    <td
                                                        className="border px-2"
                                                        colSpan={ld.colSpan}
                                                        key={ldi}
                                                    >
                                                        {ld.value ==
                                                        "as-above" ? (
                                                            <div className="flex justify-center">
                                                                ✔
                                                            </div>
                                                        ) : (
                                                            <Text {...ld.style}>
                                                                {Array.isArray(
                                                                    ld.value,
                                                                )
                                                                    ? ld.value.map(
                                                                          (
                                                                              val,
                                                                              vi,
                                                                          ) => (
                                                                              <div
                                                                                  key={
                                                                                      vi
                                                                                  }
                                                                              >
                                                                                  {
                                                                                      val
                                                                                  }
                                                                              </div>
                                                                          ),
                                                                      )
                                                                    : ld.value}
                                                            </Text>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </table>
                                </td>
                            </tr>
                        ) : (
                            <></>
                        )}
                        {/* ))} */}
                    </tbody>
                </table>
                {/* ))} */}
            </td>
        </tr>
    );
}
