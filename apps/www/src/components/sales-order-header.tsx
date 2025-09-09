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

export function OrderHeader({}) {
    const { hasFilters, filters } = useOrderFilterParams();
    // const ctx = useExportCookie();
    const api = useTRPC();
    const { refetch, isPending } = useQuery(
        api.sales.index.queryOptions(
            {
                ...(filters as any),
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
                data.map((d) => ({
                    Date: formatDate(d.createdAt),
                    "Order #": {
                        t: "s",
                        v: d.orderId,
                        l: {
                            Target: `${env.NEXT_PUBLIC_APP_URL}/sales-book/orders?sales-overview-id=${d.orderId}&sales-type=order&mode=sales&salesTab=general`,
                        },
                    },
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
            worksheet["!cols"] = [
                { width: 20 },
                { width: 20 },
                { width: 20 },
                { width: 20 },
                { width: 20 },
                { width: 20 },
                { width: 20 },
                { width: 20 },
                { width: 20 },
                // { width: 20 },
            ];
            utils.book_append_sheet(workbook, worksheet, worksheetname);
            // Save the workbook as an Excel file
            writeFile(workbook, `${title}.xlsx`);
        } catch (error) {
            toast({
                variant: "error",
                title: "Unable to complete",
            });
        }
    }
    return (
        <div className="flex gap-4">
            <OrderSearchFilter />
            <div className="flex-1"></div>

            {!hasFilters || (
                <Button
                    // disabled={isPending}
                    onClick={exportData}
                    size="sm"
                >
                    <Icons.Export className="mr-2 size-4" />
                    <span>Export</span>
                </Button>
            )}
            <Button asChild size="sm">
                <Link href="/sales-book/create-order">
                    <Icons.add className="mr-2 size-4" />
                    <span>New</span>
                </Link>
            </Button>
        </div>
    );
}

