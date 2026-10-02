"use client";
import { DataTable } from "@/components/tables-2/inventory-stock-audit/data-table";
import { useInventoryStockParams } from "@/hooks/use-inventory-stock-params";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { useSuspenseQuery } from "@gnd/ui/tanstack";

export function InventoryStockOperationsPage({
	initialSettings,
}: { initialSettings?: Partial<TableSettings> }) {
	const trpc = useTRPC();
	const { stockAuditSearch } = useInventoryStockParams();
	const audit = useSuspenseQuery(
		trpc.inventories.stockAuditVerificationReport.queryOptions(undefined),
	);
	const search = stockAuditSearch.trim().toLowerCase();
	const rows = audit.data.rows.filter(
		(row) =>
			!search ||
			`${row.category} ${row.reason} ${row.status}`
				.toLowerCase()
				.includes(search),
	);
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<div>
					<h2 className="font-medium">Audit verification</h2>
					<p className="text-sm text-muted-foreground">
						{audit.data.summary.verifiedCategories} of{" "}
						{audit.data.summary.totalCategories} categories verified in recent
						audit rows.
					</p>
				</div>
				<p className="text-sm text-muted-foreground">
					{audit.data.summary.movementCount} movements ·{" "}
					{audit.data.summary.logCount} logs
				</p>
			</div>
			{search && !rows.length ? (
				<div className="py-20 text-center">
					<p>No matching audit categories.</p>
					<p className="text-sm text-muted-foreground">
						Clear the search or use another category name.
					</p>
				</div>
			) : (
				<DataTable data={rows} initialSettings={initialSettings} />
			)}
		</div>
	);
}
