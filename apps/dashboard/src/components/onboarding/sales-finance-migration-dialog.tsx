"use client";

import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import Link from "next/link";

export function SalesFinanceMigrationDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
						<Icons.accounting className="size-5" aria-hidden="true" />
					</div>
					<DialogTitle>Sales Finance is your new starting point</DialogTitle>
					<DialogDescription className="text-left leading-relaxed">
						We’re moving sales-related financial work into Sales Finance and
						Sales Reports. Your existing Accounting workspace remains available
						while we complete the transition.
					</DialogDescription>
				</DialogHeader>
				<div className="rounded-lg border bg-muted/30 p-4 text-sm">
					<p className="font-medium">Where to work</p>
					<ul className="mt-2 space-y-2 text-muted-foreground">
						<li className="flex gap-2">
							<Icons.Check
								className="mt-0.5 size-4 shrink-0 text-primary"
								aria-hidden="true"
							/>
							<span>
								Use Sales Finance for collections, payment applications,
								refunds, and exceptions.
							</span>
						</li>
						<li className="flex gap-2">
							<Icons.Check
								className="mt-0.5 size-4 shrink-0 text-primary"
								aria-hidden="true"
							/>
							<span>
								Use Sales Reports for sales-performance analysis and governed
								reports.
							</span>
						</li>
					</ul>
				</div>
				<DialogFooter className="gap-2 sm:justify-end">
					<Button variant="outline" asChild>
						<Link
							href="/sales-book/accounting"
							onClick={() => onOpenChange(false)}
						>
							Open legacy Accounting
						</Link>
					</Button>
					<Button type="button" onClick={() => onOpenChange(false)}>
						Explore Sales Finance
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
