"use client";
import MultiSheet from "@gnd/ui/custom/sheet-v2";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@gnd/ui/dropdown-menu";

import { useFulfillmentParams } from "@/hooks/use-fulfillment-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import { Skeleton } from "@gnd/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

const PackingOverview = dynamic(
	() =>
		import("@/components/dispatch-packing-overview").then(
			(module) => module.DispatchPackingOverview,
		),
	{ ssr: false, loading: () => <Skeleton className="h-64" /> },
);

const Exceptions = dynamic(
	() =>
		import("./fulfillment-exceptions").then(
			(module) => module.FulfillmentExceptions,
		),
	{ loading: () => <Skeleton className="h-48" /> },
);

const Proof = dynamic(
	() => import("./fulfillment-proof").then((module) => module.FulfillmentProof),
	{ loading: () => <Skeleton className="h-48" /> },
);

const Route = dynamic(
	() => import("./fulfillment-route").then((module) => module.FulfillmentRoute),
	{ loading: () => <Skeleton className="h-48" /> },
);

const Activity = dynamic(
	() =>
		import("./fulfillment-activity").then(
			(module) => module.FulfillmentActivity,
		),
	{ loading: () => <Skeleton className="h-48" /> },
);

const fulfillmentTabs = [
	"overview",
	"packing",
	"exceptions",
	"proof",
	"route",
	"activity",
] as const;

const dateLabel = (date: Date | string | null | undefined) =>
	date
		? new Date(date).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: "Not recorded";

export function FulfillmentDetailSheet() {
	const [packItemsOpen, setPackItemsOpen] = useState(false);
	const {
		fulfillmentOrderId,
		fulfillmentId,
		closeFulfillment,
		fulfillmentView,
		setFulfillmentView,
	} = useFulfillmentParams();
	const trpc = useTRPC();
	const query = useQuery(
		trpc.dispatch.fulfillmentDetail.queryOptions(
			{ salesId: fulfillmentOrderId || 1, fulfillmentId: fulfillmentId || 1 },
			{ enabled: Boolean(fulfillmentOrderId && fulfillmentId) },
		),
	);
	const data = query.data;
	const item = data?.fulfillment;
	return (
		<MultiSheet.SecondaryContent>
			<div className="flex min-h-0 flex-1 flex-col">
				<SheetHeader className="border-b pb-4 pr-8 text-left">
					<SheetDescription>
						{data ? `Order ${data.order.orderNo}` : "Fulfillment details"}
					</SheetDescription>
					<SheetTitle>Fulfillment #{fulfillmentId}</SheetTitle>
					{item && (
						<Badge variant="secondary" className="w-fit capitalize">
							{item.stage.replaceAll("_", " ")}
						</Badge>
					)}
				</SheetHeader>
				{data && (
					<Tabs
						value={fulfillmentView}
						onValueChange={(value) => {
							setPackItemsOpen(false);
							void setFulfillmentView(
								value === "packing" ||
									value === "exceptions" ||
									value === "proof" ||
									value === "route" ||
									value === "activity"
									? value
									: "overview",
							);
						}}
						className="border-b py-3"
					>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									className="w-full justify-between uppercase sm:hidden"
								>
									{fulfillmentView} <span aria-hidden>⌄</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								{fulfillmentTabs.map((tab) => (
									<DropdownMenuItem
										key={tab}
										onClick={() => {
											setPackItemsOpen(false);
											void setFulfillmentView(tab);
										}}
										className="uppercase"
									>
										{tab}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
						<TabsList
							aria-label="Fulfillment overview tabs"
							className="hidden h-auto w-fit max-w-full flex-wrap justify-start gap-1 rounded-md border border-border bg-muted/40 p-1 sm:flex"
						>
							{fulfillmentTabs.map((tab) => (
								<TabsTrigger
									key={tab}
									value={tab}
									className={`h-8 min-h-8 rounded-sm px-3 text-xs uppercase data-[state=active]:translate-y-0 ${fulfillmentView === tab ? "bg-foreground text-background shadow-sm hover:bg-foreground/90" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
								>
									{tab}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
				)}
				<div className="min-h-0 flex-1 space-y-6 overflow-y-auto py-4">
					{query.isPending && <Skeleton className="h-64" />}
					{query.isError && (
						<div role="alert" className="space-y-3">
							<p>{query.error.message}</p>
							<Button variant="outline" onClick={() => query.refetch()}>
								Try again
							</Button>
						</div>
					)}
					{data && item && fulfillmentView === "packing" && (
						<PackingOverview
							key={item.id}
							salesId={data.order.id}
							dispatchId={fulfillmentId}
							surface="admin"
							packItemsOpen={packItemsOpen}
							onPackItemsOpenChange={setPackItemsOpen}
						/>
					)}
					{data && item && fulfillmentView === "exceptions" && (
						<Exceptions salesId={data.order.id} fulfillmentId={item.id} />
					)}
					{data && item && fulfillmentView === "proof" && (
						<Proof salesId={data.order.id} fulfillmentId={item.id} />
					)}
					{data && item && fulfillmentView === "route" && (
						<Route salesId={data.order.id} fulfillmentId={item.id} />
					)}
					{data && item && fulfillmentView === "activity" && (
						<Activity salesId={data.order.id} fulfillmentId={item.id} />
					)}
					{data && item && fulfillmentView === "overview" && (
						<>
							<dl className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<dt className="text-xs text-muted-foreground">Driver</dt>
									<dd>
										{item.driverName ||
											(item.deliveryMode === "pickup"
												? "Customer pickup"
												: "Unassigned")}
									</dd>
								</div>
								<div>
									<dt className="text-xs text-muted-foreground">
										Fulfillment date
									</dt>
									<dd>
										{item.dueDate ? dateLabel(item.dueDate) : "Unscheduled"}
									</dd>
								</div>
								<div>
									<dt className="text-xs text-muted-foreground">Created</dt>
									<dd>{dateLabel(item.createdAt)}</dd>
								</div>
								<div>
									<dt className="text-xs text-muted-foreground">Delivered</dt>
									<dd>{dateLabel(item.deliveredAt)}</dd>
								</div>
							</dl>
							<dl className="grid grid-cols-3 gap-3">
								<div className="border p-3">
									<dt className="text-xs text-muted-foreground">Planned</dt>
									<dd className="mt-1 font-semibold">
										{item.plannedQty ?? "Needs review"}
									</dd>
								</div>
								<div className="border p-3">
									<dt className="text-xs text-muted-foreground">Packed</dt>
									<dd className="mt-1 font-semibold">{item.packedQty}</dd>
								</div>
								<div className="border p-3">
									<dt className="text-xs text-muted-foreground">Delivered</dt>
									<dd className="mt-1 font-semibold">{item.deliveredQty}</dd>
								</div>
							</dl>
							<section className="space-y-3">
								<h3 className="font-semibold">Selected items</h3>
								{data.scopeState !== "resolved" ? (
									<p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
										Planned quantities have not been confirmed for this
										fulfillment.
									</p>
								) : (
									<ul className="divide-y rounded-md border">
										{data.items.map((line) => (
											<li
												key={line.uid}
												className="flex items-start justify-between gap-4 p-3 text-sm"
											>
												<div>
													<p className="font-medium">{line.title}</p>
													{line.size && (
														<p className="text-muted-foreground">{line.size}</p>
													)}
												</div>
												<span className="shrink-0 tabular-nums">
													{line.quantity.lh || line.quantity.rh
														? `${line.quantity.lh} LH / ${line.quantity.rh} RH`
														: `${line.quantity.qty} units`}
												</span>
											</li>
										))}
									</ul>
								)}
							</section>
							{item.risks.includes("open_exception") && (
								<p className="text-sm text-amber-700 dark:text-amber-400">
									This fulfillment has an open exception.
								</p>
							)}
						</>
					)}
				</div>
				<div className="border-t pt-4">
					<Button variant="outline" onClick={() => closeFulfillment()}>
						Back to order
					</Button>
				</div>
			</div>
		</MultiSheet.SecondaryContent>
	);
}
