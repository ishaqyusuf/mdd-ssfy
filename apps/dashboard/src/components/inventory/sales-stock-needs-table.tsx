"use client";
import { OpenInventoryStockSheet } from "@/components/open-inventory-stock-sheet";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";

type Row = Pick<
	RouterOutputs["inventories"]["salesFormStockPlan"]["rows"][number],
	| "piecesPerUnit"
	| "key"
	| "title"
	| "inventoryVariantId"
	| "mappingIssue"
	| "required"
	| "applied"
	| "available"
	| "applyQty"
	| "protectedInbound"
	| "shortage"
>;
export function SalesStockNeedsTable({ rows }: { rows: Row[] }) {
	return (
		<div className="overflow-x-auto border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Inventory</TableHead>
						<TableHead>Required pieces</TableHead>
						<TableHead>Still needed</TableHead>
						<TableHead>Reserved</TableHead>
						<TableHead>Available</TableHead>
						<TableHead>Apply now</TableHead>
						<TableHead>Inbound covered</TableHead>
						<TableHead>Shortage</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((row) => (
						<TableRow key={row.key}>
							<TableCell>
								{row.title}
								<p className="text-xs text-muted-foreground">
									{row.piecesPerUnit}{" "}
									{row.piecesPerUnit === 1 ? "piece" : "pieces"} per selected
									unit
								</p>
								{row.inventoryVariantId ? (
									<div className="mt-1">
										<OpenInventoryStockSheet
											inventoryVariantId={row.inventoryVariantId}
											size="sm"
											variant="ghost"
										/>
									</div>
								) : null}
								{row.mappingIssue ? (
									<p className="text-xs text-destructive">{row.mappingIssue}</p>
								) : null}
							</TableCell>
							<TableCell>{row.required}</TableCell>
							<TableCell>
								{Math.max(0, row.required - row.applied - row.protectedInbound)}
							</TableCell>
							<TableCell>{row.applied}</TableCell>
							<TableCell>{row.available}</TableCell>
							<TableCell>{row.applyQty}</TableCell>
							<TableCell>{row.protectedInbound}</TableCell>
							<TableCell
								className={
									row.shortage > 0
										? "text-destructive"
										: "text-muted-foreground"
								}
							>
								{row.shortage}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
