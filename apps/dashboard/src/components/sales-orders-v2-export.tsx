"use client";

import { env } from "@/env.mjs";
import { useSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { useSortParams } from "@/hooks/use-sort-params";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useMemo } from "react";
import type { WorkSheet } from "xlsx-js-style";
import {
	buildSalesOrdersExportInput,
	getSalesOrdersExportFileName,
	hasSalesOrdersExportTrigger,
	toSalesOrdersExportRows,
} from "./sales-orders-export";

const columnWidths = [
	{ wpx: 45 },
	{ wpx: 90 },
	{ wpx: 125 },
	{ wpx: 120 },
	{ wpx: 90 },
	{ wpx: 110 },
	{ wpx: 110 },
	{ wpx: 110 },
	{ wpx: 180 },
	{ wpx: 120 },
	{ wpx: 240 },
	{ wpx: 130 },
	{ wpx: 120 },
];

function styleWorksheet(
	utils: typeof import("xlsx-js-style").utils,
	worksheet: WorkSheet,
) {
	worksheet["!cols"] = columnWidths;

	if (!worksheet["!ref"]) {
		return;
	}

	worksheet["!autofilter"] = {
		ref: worksheet["!ref"],
	};
	worksheet["!freeze"] = {
		xSplit: 0,
		ySplit: 1,
	};

	const range = utils.decode_range(worksheet["!ref"]);

	for (let col = range.s.c; col <= range.e.c; col += 1) {
		const headerAddress = utils.encode_cell({ r: 0, c: col });
		const headerCell = worksheet[headerAddress];

		if (!headerCell) {
			continue;
		}

		headerCell.s = {
			font: {
				bold: true,
				color: { rgb: "FFFFFF" },
			},
			fill: {
				fgColor: { rgb: "444444" },
			},
			alignment: {
				horizontal: "center",
				vertical: "center",
			},
			border: {
				top: { style: "thin", color: { rgb: "DDDDDD" } },
				bottom: { style: "thin", color: { rgb: "DDDDDD" } },
				left: { style: "thin", color: { rgb: "DDDDDD" } },
				right: { style: "thin", color: { rgb: "DDDDDD" } },
			},
		};
	}
}

export function SalesOrdersV2Export() {
	const trpc = useTRPC();
	const { filters, hasFilters } = useSalesOrdersV2FilterParams();
	const { params } = useSortParams();
	const selectedSalesIds = useSalesOrdersStore((state) => state.selectedSalesIds);

	const exportInput = useMemo(
		() => buildSalesOrdersExportInput(filters, selectedSalesIds, params.sort),
		[filters, selectedSalesIds, params.sort],
	);

	const { refetch, isFetching } = useQuery(
		trpc.sales.getOrders.queryOptions(exportInput, {
			enabled: false,
		}),
	);

	if (!hasSalesOrdersExportTrigger(hasFilters, selectedSalesIds)) {
		return null;
	}

	async function exportData() {
		try {
			toast({
				variant: "spinner",
				title: "Preparing report...",
			});

			const result = await refetch();

			if (result.error) {
				throw result.error;
			}

			const orders = result.data?.data ?? [];

			if (orders.length === 0) {
				toast({
					variant: "error",
					title: "No orders found",
					description: "There are no orders to export for the current selection.",
				});
				return;
			}

			const { utils, writeFile } = await import("xlsx-js-style");
			const workbook = utils.book_new();
			const worksheet = utils.json_to_sheet(
				toSalesOrdersExportRows(orders, env.NEXT_PUBLIC_APP_URL),
			);

			styleWorksheet(utils, worksheet);
			utils.book_append_sheet(workbook, worksheet, "Orders");
			writeFile(workbook, getSalesOrdersExportFileName());

			toast({
				title: "Report downloaded",
				description: "Your sales orders report is ready.",
			});
		} catch (error) {
			console.error(error);
			toast({
				variant: "error",
				title: "Something went wrong",
				description: "Unable to export sales orders. Please try again.",
			});
		}
	}

	return (
		<Button
			className="h-8"
			disabled={isFetching}
			onClick={exportData}
			size="sm"
			variant="outline"
		>
			<Icons.Export className="mr-2 size-4" />
			<span className="hidden lg:inline">{isFetching ? "Preparing" : "Report"}</span>
		</Button>
	);
}
