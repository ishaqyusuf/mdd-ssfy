import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import {
	AlertTriangle,
	ArrowUpRight,
	Box,
	CircleCheck,
	Clock3,
	PackageCheck,
	UserRound,
} from "lucide-react";

import {
	getRemainingQuantity,
	type PrototypeState,
} from "./prototype-state";

function Metric({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: string;
	icon: typeof Box;
}) {
	return (
		<Card className="shadow-none">
			<CardContent className="flex items-start justify-between gap-3 p-4">
				<div className="min-w-0">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						{label}
					</p>
					<p className="mt-1 truncate text-base font-semibold">{value}</p>
				</div>
				<div className="rounded-md bg-muted p-2 text-muted-foreground">
					<Icon className="size-4" />
				</div>
			</CardContent>
		</Card>
	);
}

export function PrototypeAdminPanel({ state }: { state: PrototypeState }) {
	const remaining = getRemainingQuantity(state);
	const isException =
		state.assistance === "waiting" || state.assistance === "denied";

	return (
		<section className="min-w-0 rounded-xl border bg-background shadow-sm">
			<header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<h2 className="text-lg font-semibold">Fulfillment workspace</h2>
						<Badge variant="outline">Admin</Badge>
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						Order lifecycle, assignment, dispatch, and exceptions in one view.
					</p>
				</div>
				<Button variant="outline" size="sm">
					Open order <ArrowUpRight className="ml-2 size-4" />
				</Button>
			</header>

			<div className="space-y-4 p-5">
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<Metric label="Order status" value={state.orderStatus} icon={Box} />
					<Metric
						label="Dispatch status"
						value={state.dispatchStatus}
						icon={PackageCheck}
					/>
					<Metric label="Assigned to" value={state.assignedTo} icon={UserRound} />
					<Metric
						label="Remaining"
						value={`${remaining} of ${state.ordered}`}
						icon={Clock3}
					/>
				</div>

				{state.stale ? (
					<Alert>
						<AlertTriangle />
						<AlertTitle>This view is out of date</AlertTitle>
						<AlertDescription>
							A newer dispatch revision is available. Refresh before taking action.
						</AlertDescription>
					</Alert>
				) : null}

				{isException ? (
					<Alert variant={state.assistance === "denied" ? "destructive" : "default"}>
						<AlertTriangle />
						<AlertTitle>
							{state.assistance === "denied"
								? "Assistance denied — driver is still blocked"
								: "Driver needs assistance"}
						</AlertTitle>
						<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
							<span>
								{state.short} items are unavailable at the packing station.
							</span>
							<div className="flex gap-2">
								<Button size="sm" variant="outline">
									Contact production
								</Button>
								<Button size="sm">Review request</Button>
							</div>
						</AlertDescription>
					</Alert>
				) : null}

				<Card className="shadow-none">
					<CardHeader className="flex-row items-start justify-between gap-3 space-y-0 border-b p-4">
						<div>
							<div className="flex flex-wrap items-center gap-2">
								<CardTitle className="text-base">ORD-10482</CardTitle>
								{state.backOrder ? (
									<Badge variant="destructive">Back order</Badge>
								) : null}
								<Badge variant="secondary">{state.dispatchStatus}</Badge>
							</div>
							<p className="mt-1 text-sm text-muted-foreground">
								Northstar Construction · 72 Harbor Lane
							</p>
						</div>
						<span className="text-xs text-muted-foreground">rev {state.revision}</span>
					</CardHeader>
					<CardContent className="p-0">
						<div className="grid grid-cols-5 border-b bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
							<span className="col-span-2">Item</span>
							<span className="text-right">Ordered</span>
							<span className="text-right">Packed</span>
							<span className="text-right">Short</span>
						</div>
						<div className="grid min-h-12 grid-cols-5 items-center px-4 py-2 text-sm">
							<div className="col-span-2 min-w-0">
								<p className="truncate font-medium">Series 890 patio door set</p>
								<p className="truncate text-xs text-muted-foreground">White · 36 × 80</p>
							</div>
							<span className="text-right tabular-nums">{state.ordered}</span>
							<span className="text-right tabular-nums">{state.packed}</span>
							<span className="text-right tabular-nums">{state.short}</span>
						</div>
					</CardContent>
				</Card>

				<div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
					<Card className="shadow-none">
						<CardHeader className="p-4 pb-2">
							<CardTitle className="text-sm">Dispatch history</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 p-4 pt-2">
							{state.history.slice(-4).reverse().map((entry, index) => (
								<div className="flex gap-3 text-sm" key={`${entry}-${index}`}>
									<CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
									<div>
										<p>{entry}</p>
										<p className="text-xs text-muted-foreground">
											Prototype event · revision {state.revision - index}
										</p>
									</div>
								</div>
							))}
						</CardContent>
					</Card>

					<Card className="shadow-none">
						<CardHeader className="p-4 pb-2">
							<CardTitle className="text-sm">Dispatch actions</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-2 p-4 pt-2">
							<Button className="justify-start" disabled={state.stale}>
								{state.assignedTo === "Unassigned" ? "Assign driver" : "View dispatch"}
							</Button>
							<Button variant="outline" className="justify-start">
								{state.stale ? "Refresh revision" : "Create another dispatch"}
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}
