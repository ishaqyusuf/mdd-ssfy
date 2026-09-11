"use client";

import type { projectFulfillmentQuantities } from "@gnd/sales/fulfillment-quantities";
import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@gnd/ui/dropdown-menu";

export function FulfillmentOrderBacklog({
	quantities,
	onAssign,
	completed,
}: {
	quantities: ReturnType<typeof projectFulfillmentQuantities>;
	onAssign: () => void;
	completed: boolean;
}) {
	if (!quantities.resolved)
		return (
			<p
				role="status"
				className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
			>
				Quantities need review. Some order quantities or fulfillment evidence are incomplete. Review quantities before assigning.
			</p>
		);
	if (!quantities.backlogQty || completed) return null;
	return (
		<details className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4">
			<summary className="cursor-pointer text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
				{quantities.backlogQty} units backlog
			</summary>
			<div className="mt-4 space-y-3 border-t border-amber-500/20 pt-3">
				<div className="flex items-center justify-between">
					<h4 className="text-sm font-medium">Backlog items</h4>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm">
								Options
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={onAssign}>Assign</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<ul className="divide-y divide-amber-500/20">
					{quantities.lines
						.filter(
							(line) =>
								line.availableToAssign.qty +
									line.availableToAssign.lh +
									line.availableToAssign.rh >
								0,
						)
						.map((line) => (
							<li
								key={line.uid}
								className="flex items-start justify-between gap-4 py-3 text-sm"
							>
								<div>
									<p className="font-medium">
										{line.title || `Item ${line.salesItemId}`}
									</p>
									{line.size && (
										<p className="text-muted-foreground">{line.size}</p>
									)}
								</div>
								<span className="shrink-0 tabular-nums">
									{line.availableToAssign.lh || line.availableToAssign.rh
										? `${line.availableToAssign.lh} LH / ${line.availableToAssign.rh} RH`
										: `${line.availableToAssign.qty} units`}
								</span>
							</li>
						))}
				</ul>
			</div>
		</details>
	);
}
