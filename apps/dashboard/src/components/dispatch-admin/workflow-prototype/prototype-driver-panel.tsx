import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Progress } from "@gnd/ui/progress";
import {
	AlertTriangle,
	ArrowLeft,
	Check,
	ChevronRight,
	CircleAlert,
	MapPin,
	PackageOpen,
	RefreshCcw,
	Truck,
} from "lucide-react";

import type { PrototypeState } from "./prototype-state";

function getPrimaryAction(state: PrototypeState) {
	if (state.stale) return { label: "Refresh assignment", icon: RefreshCcw };
	if (state.proof === "retry") return { label: "Retry proof upload", icon: RefreshCcw };
	if (state.assistance === "waiting" || state.assistance === "denied") {
		return { label: "View assistance request", icon: CircleAlert };
	}
	if (state.dispatchStatus === "Assigned") return { label: "Start packing", icon: PackageOpen };
	if (state.dispatchStatus === "Packing") return { label: "Continue packing", icon: PackageOpen };
	if (state.dispatchStatus === "Ready to load") return { label: "Confirm load", icon: Truck };
	if (state.dispatchStatus === "In transit") return { label: "Add delivery proof", icon: MapPin };
	return { label: "Delivery complete", icon: Check };
}

export function PrototypeDriverPanel({ state }: { state: PrototypeState }) {
	const packedPercent = Math.round((state.packed / state.ordered) * 100);
	const primary = getPrimaryAction(state);
	const PrimaryIcon = primary.icon;

	return (
		<section className="mx-auto w-full max-w-[390px] overflow-hidden rounded-[2rem] border-[6px] border-slate-950 bg-slate-50 shadow-xl dark:bg-slate-950">
			<div className="flex h-7 items-center justify-center bg-slate-950">
				<div className="h-1.5 w-20 rounded-full bg-slate-700" />
			</div>
			<div className="min-h-[680px] bg-background">
				<header className="border-b px-4 pb-4 pt-3">
					<div className="flex items-center justify-between gap-3">
						<Button variant="ghost" size="icon" className="size-11" aria-label="Back to assignments">
							<ArrowLeft className="size-5" />
						</Button>
						<div className="text-center">
							<p className="text-xs font-medium text-muted-foreground">TODAY · STOP 2 OF 5</p>
							<p className="font-semibold">ORD-10482</p>
						</div>
						<div className="size-11" />
					</div>
					<div className="mt-3 flex items-center justify-between gap-3">
						<Badge variant="secondary">{state.dispatchStatus}</Badge>
						<span className="text-xs text-muted-foreground">Assigned to you</span>
					</div>
				</header>

				<main className="space-y-4 p-4">
					{state.stale ? (
						<Alert>
							<RefreshCcw />
							<AlertTitle>Assignment changed</AlertTitle>
							<AlertDescription>
								Refresh before continuing so you do not pack an old dispatch.
							</AlertDescription>
						</Alert>
					) : null}

					{state.assistance === "waiting" || state.assistance === "denied" ? (
						<Alert variant={state.assistance === "denied" ? "destructive" : "default"}>
							<AlertTriangle />
							<AlertTitle>
								{state.assistance === "denied"
									? "Request needs another review"
									: "Admin has been notified"}
							</AlertTitle>
							<AlertDescription>
								{state.assistance === "denied"
									? "Do not substitute items. Keep this order paused."
									: "You can move to another assignment while this is reviewed."}
							</AlertDescription>
						</Alert>
					) : null}

					{state.proof === "retry" ? (
						<Alert>
							<CircleAlert />
							<AlertTitle>Proof saved on this device</AlertTitle>
							<AlertDescription>
								The connection is weak. Retry when the signal improves; do not take another photo.
							</AlertDescription>
						</Alert>
					) : null}

					<div className="rounded-xl border bg-card p-4">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Deliver to</p>
								<h2 className="mt-1 font-semibold">Northstar Construction</h2>
								<p className="mt-1 text-sm text-muted-foreground">72 Harbor Lane · Bay 4</p>
							</div>
							<Button variant="outline" size="icon" className="size-11" aria-label="Open directions">
								<MapPin className="size-5" />
							</Button>
						</div>
					</div>

					<div className="rounded-xl border bg-card p-4">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="font-medium">Packing progress</p>
								<p className="text-sm text-muted-foreground">{state.packed} of {state.ordered} packed</p>
							</div>
							<span className="text-lg font-semibold tabular-nums">{packedPercent}%</span>
						</div>
						<Progress value={packedPercent} className="mt-3" />
						<button type="button" className="mt-4 flex min-h-14 w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/60">
							<div className="min-w-0">
								<p className="truncate text-sm font-medium">Series 890 patio door set</p>
								<p className="text-xs text-muted-foreground">{state.short ? `${state.short} unavailable` : "12 allocated"}</p>
							</div>
							<ChevronRight className="size-5 shrink-0 text-muted-foreground" />
						</button>
					</div>

					{state.backOrder ? (
						<div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
							<PackageOpen className="mt-0.5 size-5 shrink-0" />
							<div>
								<p className="font-medium">Partial dispatch approved</p>
								<p className="mt-1 text-sm opacity-80">Deliver 8 now. The remaining 4 stay on back order.</p>
							</div>
						</div>
					) : null}
				</main>

				<footer className="sticky bottom-0 border-t bg-background/95 p-4 backdrop-blur">
					<Button className="min-h-12 w-full text-base" disabled={state.dispatchStatus === "Delivered"}>
						<PrimaryIcon className="mr-2 size-5" /> {primary.label}
					</Button>
					{state.assistance === "none" && state.dispatchStatus === "Packing" ? (
						<Button variant="ghost" className="mt-2 min-h-11 w-full text-muted-foreground">
							Report an item problem
						</Button>
					) : null}
				</footer>
			</div>
		</section>
	);
}
