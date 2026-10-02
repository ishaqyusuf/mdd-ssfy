"use client";

import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import { useState } from "react";
import type { NewSalesFormRecord } from "./schema";

type Reconciliation = NonNullable<
	NewSalesFormRecord["financialReconciliation"]
>;

const totals = [
	["Subtotal", "subTotal"],
	["Tax", "taxTotal"],
	["Grand total", "grandTotal"],
	["Amount due", "amountDue"],
] as const;

const money = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});
const differenceMoney = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	signDisplay: "exceptZero",
});

export function SavedTotalsNotice({
	reconciliation,
	onReviewLineItems,
}: {
	reconciliation: Reconciliation;
	onReviewLineItems: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [returnToItems, setReturnToItems] = useState(false);
	const totalDifference = reconciliation.difference.grandTotal;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/20">
				<div className="flex min-w-0 items-center gap-2">
					<Icons.Info
						className="size-4 shrink-0 text-amber-700 dark:text-amber-400"
						aria-hidden="true"
					/>
					<output className="block font-medium">
						Saved and recalculated totals differ
						{totalDifference !== 0
							? ` by ${money.format(Math.abs(totalDifference))}`
							: ""}
					</output>
				</div>
				<DialogTrigger asChild>
					<Button
						type="button"
						variant="link"
						size="sm"
						className="h-auto shrink-0 self-start px-0 py-1 text-xs sm:self-auto"
					>
						Review totals
						<Icons.ArrowRight className="ml-1 size-4" aria-hidden="true" />
					</Button>
				</DialogTrigger>
			</div>
			<DialogContent
				className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg"
				onCloseAutoFocus={(event) => {
					if (!returnToItems) return;
					event.preventDefault();
					setReturnToItems(false);
					onReviewLineItems();
				}}
			>
				<DialogHeader className="text-left">
					<DialogTitle>Review saved and recalculated totals</DialogTitle>
					<DialogDescription>
						The saved totals differ from this form’s calculations. Review the
						line items before saving.
					</DialogDescription>
				</DialogHeader>
				<div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
					<div>
						<p className="text-xs text-muted-foreground">Recalculated total</p>
						<p className="mt-1 text-2xl font-semibold tabular-nums">
							{money.format(reconciliation.recalculated.grandTotal)}
						</p>
					</div>
					{totalDifference !== 0 ? (
						<span className="rounded-md bg-amber-100/70 px-2 py-1 text-xs tabular-nums text-amber-800 dark:bg-amber-950 dark:text-amber-300">
							{differenceMoney.format(totalDifference)}
						</span>
					) : null}
				</div>
				<div className="overflow-x-auto">
					<Table
						className="text-xs tabular-nums"
						aria-label="Saved and recalculated totals"
					>
						<TableHeader className="border-x-0 border-t-0">
							<TableRow>
								<TableHead scope="col" className="px-2">
									Total
								</TableHead>
								<TableHead scope="col" className="px-2 text-right">
									Saved
								</TableHead>
								<TableHead scope="col" className="px-2 text-right">
									Recalculated
								</TableHead>
								<TableHead scope="col" className="px-2 text-right">
									Difference
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="border-0">
							{totals.map(([label, key]) => (
								<TableRow
									key={key}
									className={key === "grandTotal" ? "font-semibold" : undefined}
								>
									<TableHead
										scope="row"
										className="h-auto whitespace-nowrap px-2 py-3 text-xs font-[inherit]"
									>
										{label}
									</TableHead>
									<TableCell className="whitespace-nowrap px-2 text-right">
										{money.format(reconciliation.saved[key])}
									</TableCell>
									<TableCell className="whitespace-nowrap px-2 text-right">
										{money.format(reconciliation.recalculated[key])}
									</TableCell>
									<TableCell className="whitespace-nowrap px-2 text-right">
										{differenceMoney.format(reconciliation.difference[key])}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
				<p className="text-xs text-muted-foreground">
					Amount due is shown separately; it is not added to the grand total.
				</p>
				<p className="text-sm text-muted-foreground">
					Opening this form did not change or autosave the order.
				</p>
				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						type="button"
						variant="outline"
						onClick={() => setOpen(false)}
					>
						Back to order
					</Button>
					<Button
						type="button"
						onClick={() => {
							setReturnToItems(true);
							setOpen(false);
						}}
					>
						Review line items
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
