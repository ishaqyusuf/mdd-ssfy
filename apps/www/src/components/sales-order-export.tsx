"use client";
import { OrderSearchFilter } from "./sales-order-search-filter";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { Icons } from "@gnd/ui/custom/icons";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@gnd/ui/use-toast";
import dayjs from "dayjs";
import { utils, writeFile } from "xlsx";
import { formatDate } from "@gnd/utils/dayjs";
import { formatMoney } from "@gnd/utils";
import { env } from "@/env.mjs";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useMemo } from "react";

export function SalesOrderExport() {
    const { hasFilters, filters } = useOrderFilterParams();
    // const ctx = useExportCookie();
    const { rowSelection } = useSalesOrdersStore();
    const selectedIds = useMemo(() => {
        return Object.entries(rowSelection)
            .filter(([a, b]) => b)
            .map(([a, b]) => +a);
    }, [rowSelection]);
    const api = useTRPC();

    const { refetch, isPending } = useQuery(
        api.sales.index.queryOptions(
            {
                ...(filters as any),
                salesIds: selectedIds.length ? selectedIds : undefined,
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
            let title = `sales-report-export-${dayjs().format("DD-MM-YYYY")}`;
            let worksheetname = "";
            const workbook = utils.book_new();
            const worksheet = utils?.json_to_sheet(
                data.map((d, di) => ({
                    Sn: `${di + 1}.`,
                    Date: formatDate(d.createdAt),
                    "Order #": {
                        t: "s",
                        v: d.orderId,
                        l: {
                            Target: `${env.NEXT_PUBLIC_APP_URL}/sales-book/orders?sales-overview-id=${d.orderId}&sales-type=order&mode=sales&salesTab=general`,
                        },
                    },
                    "Sales Rep": d.salesRep,
                    "P.O": d.poNo,
                    invoice: formatMoney(d.invoice?.total),
                    paid: formatMoney(d.invoice?.paid),
                    pending: formatMoney(d.invoice?.pending),
                    customer: d.displayName,
                    phone: d.customerPhone,
                    address: d.address,
                    // viewOrder: `${env.NEXT_PUBLIC_APP_URL}/sales-book/orders?sales-overview-id=${d.orderId}`,
                })),
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
            utils.book_append_sheet(workbook, worksheet, worksheetname);
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

