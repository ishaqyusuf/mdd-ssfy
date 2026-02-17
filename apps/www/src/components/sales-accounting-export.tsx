"use client";
import { Button } from "@gnd/ui/button";
import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { Icons } from "@gnd/ui/icons";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import dayjs from "dayjs";
// import { utils, writeFile } from "xlsx";
import { utils, writeFile } from "xlsx-js-style";
import { formatDate } from "@gnd/utils/dayjs";
import { formatMoney } from "@gnd/utils";
import { env } from "@/env.mjs";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useMemo } from "react";
import { useSalesAccountingFilterParams } from "@/hooks/use-sales-accounting-filter-params";
import { useSalesAccountingStore } from "@/store/saless-account-store";
import { _trpc } from "./static-trpc";
import { RouterOutputs } from "@api/trpc/routers/_app";

export function SalesAccountingExport() {
    const { hasFilters, filters } = useSalesAccountingFilterParams();
    const { rowSelection } = useSalesAccountingStore();
    const selectedIds = useMemo(() => {
        return Object.entries(rowSelection)
            .filter(([a, b]) => b)
            .map(([a, b]) => +a);
    }, [rowSelection]);

    const { refetch, isPending, data } = useQuery(
        _trpc.sales.getSalesAccountings.queryOptions(
            {
                ...(filters as any),
                // salesIds: selectedIds.length ? selectedIds : undefined,
                size: 999,
            },
            {
                enabled: false,
            },
        ),
    );
    async function exportData() {
        try {
            toast({
                title: "Preparing export.",
                variant: "spinner",
            });
            const {
                data: { data },
            } = await refetch();
            // console.log(result);
            let title = `sales-accounting-report-export-${dayjs().format(
                "DD-MM-YYYY",
            )}`;
            let worksheetname = "";
            const workbook = utils.book_new();
            const worksheet = utils?.json_to_sheet(
                data.map((d, di) => {
                    return {
                        Sn: `${di + 1}.`,
                        Date: formatDate(d.createdAt),
                        invoice: formatMoney(d.amount),
                        method: [d.paymentMethod, d.checkNo]
                            .filter(Boolean)
                            .join(" | "),
                        "Order #": {
                            t: "s",
                            v: d.orderIds,
                            l: {
                                Target: `${env.NEXT_PUBLIC_APP_URL}/sales-book/orders?sales-overview-id=${d.orderIds}&sales-type=order&mode=sales&salesTab=general`,
                            },
                        },
                        "Sales Rep": d.salesReps?.join(","),
                        "Processed By": d.authorName,
                        status: [d.status, d.reason]
                            ?.filter(Boolean)
                            .join(" | "),
                        "Sub Total": formatMoney(d.subTotal),
                        Labor: formatMoney(d.laborCost),
                        Delivery: formatMoney(d.deliveryCost),
                        // viewOrder: `${env.NEXT_PUBLIC_APP_URL}/sales-book/orders?sales-overview-id=${d.orderId}`,
                    };
                }),
                {
                    cellStyles: true,
                },
            );
            // auto column widths
            worksheet["!cols"] = [
                { wch: 8 }, // Date
                { wch: 12 }, // Date
                { wch: 15 }, // Order #
                { wch: 15 }, // Order #
                { wch: 15 }, // PO
                { wch: 12 }, // Invoice
                { wch: 12 }, // Paid
                { wch: 12 }, // Pending
                { wch: 25 }, // Customer
                { wch: 15 }, // Phone
                { wch: 30 }, // Address
                // { wch: 15 }, // ViewOrder
            ];
            // style header row
            // const range = utils.decode_range(worksheet["!ref"]!);
            // for (let C = range.s.c; C <= range.e.c; ++C) {
            //     const cell = worksheet[utils.encode_cell({ r: 0, c: C })];
            //     if (cell) {
            //         cell.s = {
            //             font: { bold: true, color: { rgb: "FFFFFF" } },
            //             fill: { fgColor: { rgb: "4472C4" } }, // blue header background
            //             alignment: { horizontal: "center", vertical: "center" },
            //         };
            //     }
            // }
            // freeze header row
            worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
            // add borders + formatting
            // for (let R = range.s.r; R <= range.e.r; ++R) {
            //     for (let C = range.s.c; C <= range.e.c; ++C) {
            //         const cell = worksheet[utils.encode_cell({ r: R, c: C })];
            //         if (cell) {
            //             cell.s = {
            //                 ...cell.s,
            //                 border: {
            //                     top: {
            //                         style: "thin",
            //                         color: { rgb: "999999" },
            //                     },
            //                     bottom: {
            //                         style: "thin",
            //                         color: { rgb: "999999" },
            //                     },
            //                     left: {
            //                         style: "thin",
            //                         color: { rgb: "999999" },
            //                     },
            //                     right: {
            //                         style: "thin",
            //                         color: { rgb: "999999" },
            //                     },
            //                 },
            //                 alignment: { vertical: "center" },
            //             };
            //         }
            //     }
            // }
            // 🔹 Optional styling (needs xlsx-style or SheetJS Pro)
            // const range = utils.decode_range(worksheet["!ref"]!);
            // for (let C = range.s.c; C <= range.e.c; ++C) {
            //     const cell = worksheet[utils.encode_cell({ r: 0, c: C })];
            //     if (cell) {
            //         cell.s = {
            //             font: { bold: true, color: { rgb: "FFFFFF" } },
            //             fill: { fgColor: { rgb: "4472C4" } },
            //             alignment: { horizontal: "center", vertical: "center" },
            //         };
            //     }
            // }
            // Save the workbook as an Excel file

            worksheet["!autofilter"] = { ref: worksheet["!ref"] }; // highlight Excel filter

            // --- NEW: style header row (row 0) ---
            const headerRange = utils.decode_range(worksheet["!ref"]);
            for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
                const cell = worksheet[utils.encode_cell({ r: 0, c: C })];
                if (cell) {
                    cell.s = {
                        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
                        fill: { fgColor: { rgb: "4472C4" } }, // Blue header background
                        alignment: { horizontal: "center", vertical: "center" },
                        border: {
                            top: { style: "thin", color: { rgb: "CCCCCC" } },
                            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                            left: { style: "thin", color: { rgb: "CCCCCC" } },
                            right: { style: "thin", color: { rgb: "CCCCCC" } },
                        },
                    };
                }
            }
            // --- NEW: add border + center align for all body rows ---
            for (let R = 1; R <= headerRange.e.r; ++R) {
                for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
                    const cell = worksheet[utils.encode_cell({ r: R, c: C })];
                    if (cell) {
                        cell.s = {
                            alignment: { vertical: "center" },
                            border: {
                                top: {
                                    style: "thin",
                                    color: { rgb: "EEEEEE" },
                                },
                                bottom: {
                                    style: "thin",
                                    color: { rgb: "EEEEEE" },
                                },
                                left: {
                                    style: "thin",
                                    color: { rgb: "EEEEEE" },
                                },
                                right: {
                                    style: "thin",
                                    color: { rgb: "EEEEEE" },
                                },
                            },
                        };
                    }
                }
            }

            utils.book_append_sheet(workbook, worksheet, worksheetname);
            // --- NEW: Summary breakdown sheet ---
            const totals = {
                TotalCount: data.length,
                TotalInvoice: data.reduce((a, b) => a + b.amount, 0),
                TotalSubTotal: data.reduce((a, b) => a + b.subTotal, 0),
                TotalLabor: data.reduce((a, b) => a + b.laborCost, 0),
                TotalDelivery: data.reduce((a, b) => a + b.deliveryCost, 0),
            };

            const breakdownSheet = utils.json_to_sheet([
                { Metric: "Total Records", Value: totals.TotalCount },
                {
                    Metric: "Invoice Total",
                    Value: formatMoney(totals.TotalInvoice),
                },
                {
                    Metric: "Subtotal Total",
                    Value: formatMoney(totals.TotalSubTotal),
                },
                {
                    Metric: "Labor Cost Total",
                    Value: formatMoney(totals.TotalLabor),
                },
                {
                    Metric: "Delivery Cost Total",
                    Value: formatMoney(totals.TotalDelivery),
                },
            ]);

            // Add minimal styling for summary
            breakdownSheet["!cols"] = [{ wch: 25 }, { wch: 25 }];
            const bRange = utils.decode_range(breakdownSheet["!ref"]);
            for (let C = bRange.s.c; C <= bRange.e.c; ++C) {
                const cell = breakdownSheet[utils.encode_cell({ r: 0, c: C })];
                if (cell) {
                    cell.s = {
                        font: { bold: true },
                        fill: { fgColor: { rgb: "D9E1F2" } },
                        alignment: { horizontal: "center", vertical: "center" },
                    };
                }
            }

            utils.book_append_sheet(workbook, breakdownSheet, "Report Summary");
            writeFile(workbook, `${title}.xlsx`);
        } catch (error) {
            toast({
                variant: "error",
                title: "Unable to complete",
            });
        }
    }
    if (!hasFilters && !selectedIds.length) return null;
    return (
        <Button
            // disabled={isPending}
            onClick={exportData}
            size="sm"
        >
            <Icons.Export className="mr-2 size-4" />
            <span>Export</span>
        </Button>
    );
}

