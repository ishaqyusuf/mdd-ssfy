"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";
import { MoreHorizontal } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@gnd/ui/dropdown-menu";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { useFulfillmentParams } from "@/hooks/use-fulfillment-params";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";

type Fulfillment =
	RouterOutputs["dispatch"]["fulfillmentOrder"]["workspace"]["fulfillments"][number];
const dateLabel = (value: string | Date | null | undefined) =>
	value
		? new Date(value).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: "Unscheduled";
function Status({ item }: { item: Fulfillment }) {
	return (
		<div className="space-y-1">
			<Badge variant="secondary" className="capitalize">
				{item.stage.replaceAll("_", " ")}
			</Badge>
			{item.risks.includes("open_exception") && (
				<p className="text-xs text-amber-700 dark:text-amber-400">
					Open exception
				</p>
			)}
		</div>
	);
}
function Quantities({ item }: { item: Fulfillment }) {
	return (
		<dl className="text-xs tabular-nums">
			<div className="flex gap-2">
				<dt>Planned</dt>
				<dd>{item.plannedQty ?? "Needs review"}</dd>
			</div>
			<div className="flex gap-2">
				<dt>Packed</dt>
				<dd>{item.packedQty}</dd>
			</div>
			<div className="flex gap-2">
				<dt>Delivered</dt>
				<dd>{item.deliveredQty}</dd>
			</div>
		</dl>
	);
}
function Driver({ item }: { item: Fulfillment }) {
	return (
		<div>
			<p className="text-sm">
				{item.driverName ||
					(item.deliveryMode === "pickup" ? "Customer pickup" : "Unassigned")}
			</p>
			<p className="text-xs text-muted-foreground">{dateLabel(item.dueDate)}</p>
		</div>
	);
}
function FulfillmentActions({ item }: { item: Fulfillment }) {
	const { openEditFulfillment, openCompleteFulfillment } =
		useFulfillmentParams();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label={`Actions for fulfillment ${item.id}`}
				>
					<MoreHorizontal className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onSelect={() => openEditFulfillment(item.id)}>
					Edit
				</DropdownMenuItem>
				{item.stage !== "fulfilled" && item.stage !== "cancelled" && (
					<DropdownMenuItem onSelect={() => openCompleteFulfillment(item.id)}>
						Mark as completed
					</DropdownMenuItem>
				)}
				<DropdownMenuItem onSelect={() => openEditFulfillment(item.id)}>
					Change date
				</DropdownMenuItem>
				{item.deliveryMode !== "pickup" && (
					<DropdownMenuItem onSelect={() => openEditFulfillment(item.id)}>
						Change driver
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
export function FulfillmentHistory({ items }: { items: Fulfillment[] }) {
	const { openFulfillment } = useFulfillmentParams();
	return (
		<>
			<div className="hidden overflow-x-auto rounded-md border sm:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Fulfillment</TableHead>
							<TableHead>Driver / Date</TableHead>
							<TableHead>Quantities</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>
								<span className="sr-only">Actions</span>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((item) => (
							<TableRow key={item.id}>
								<TableCell className="font-medium">
									<Button
										variant="link"
										className="h-auto p-0"
										onClick={() => openFulfillment(item.id)}
									>
										#{item.id}
									</Button>
								</TableCell>
								<TableCell>
									<Driver item={item} />
								</TableCell>
								<TableCell>
									<Quantities item={item} />
								</TableCell>
								<TableCell>
									<Status item={item} />
								</TableCell>
								<TableCell>
									<FulfillmentActions item={item} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
			<ul className="divide-y rounded-md border sm:hidden">
				{items.map((item) => (
					<li key={item.id} className="space-y-3 p-4">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<h4 className="font-medium">Fulfillment #{item.id}</h4>
							<FulfillmentActions item={item} />
							<Status item={item} />
						</div>
						<Driver item={item} />
						<Quantities item={item} />
						<Button
							variant="link"
							className="h-auto p-0"
							onClick={() => openFulfillment(item.id)}
						>
							View fulfillment
						</Button>
					</li>
				))}
			</ul>
		</>
	);
}
