"use client";

import { Icons } from "@gnd/ui/icons";
import type { NewSalesFormRecord } from "../schema";

type SalesHistorySnapshotPreviewProps = {
	record: NewSalesFormRecord;
};

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function lineTitle(
	line: NewSalesFormRecord["lineItems"][number],
	index: number,
) {
	return (
		String(line.title || "").trim() ||
		String(line.description || "").trim() ||
		`Item ${index + 1}`
	);
}

export function SalesHistorySnapshotPreview(
	props: SalesHistorySnapshotPreviewProps,
) {
	return (
		<section
			aria-label="Sales history snapshot preview"
			className="space-y-4 p-4 sm:p-6 lg:p-8"
		>
			<div className="rounded-xl border bg-card p-4 shadow-sm">
				<div className="flex items-start gap-3">
					<div className="rounded-full bg-amber-100 p-2 text-amber-800">
						<Icons.History className="size-5" />
					</div>
					<div>
						<h3 className="font-semibold">Read-only version preview</h3>
						<p className="mt-1 text-sm text-muted-foreground">
							Review the saved items and totals below. Use the banner above to
							restore this version or return to the current draft.
						</p>
					</div>
				</div>
			</div>

			<div className="space-y-3">
				{props.record.lineItems.map((line, index) => (
					<article
						className="rounded-xl border bg-card p-4 shadow-sm"
						key={line.uid || line.id || index}
					>
						<div className="flex items-start justify-between gap-4">
							<div className="min-w-0">
								<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
									Item {index + 1}
								</p>
								<h4 className="mt-1 truncate font-semibold">
									{lineTitle(line, index)}
								</h4>
								<p className="mt-1 text-xs text-muted-foreground">
									Quantity {Number(line.qty || 0)}
								</p>
							</div>
							<p className="shrink-0 text-lg font-bold">
								{currency(line.lineTotal)}
							</p>
						</div>

						{line.housePackageTool?.doors?.length ? (
							<div className="mt-3 space-y-2 border-t pt-3">
								{line.housePackageTool.doors.map((door, doorIndex) => (
									<div
										className="flex items-center justify-between gap-3 text-xs"
										key={door.id || `${door.dimension}-${doorIndex}`}
									>
										<span className="text-muted-foreground">
											{door.dimension || "Door"} ·{" "}
											{Number(
												door.totalQty ||
													Number(door.lhQty || 0) + Number(door.rhQty || 0),
											)}{" "}
											qty
										</span>
										<span className="font-medium">
											{currency(door.lineTotal)}
										</span>
									</div>
								))}
							</div>
						) : null}
					</article>
				))}
			</div>

			<div className="grid gap-2 rounded-xl border bg-muted/30 p-4 text-sm sm:grid-cols-3">
				<div>
					<p className="text-muted-foreground">Subtotal</p>
					<p className="font-semibold">
						{currency(props.record.summary.subTotal)}
					</p>
				</div>
				<div>
					<p className="text-muted-foreground">Tax</p>
					<p className="font-semibold">
						{currency(props.record.summary.taxTotal)}
					</p>
				</div>
				<div className="sm:text-right">
					<p className="text-muted-foreground">Grand total</p>
					<p className="text-lg font-bold">
						{currency(props.record.summary.grandTotal)}
					</p>
				</div>
			</div>
		</section>
	);
}
