"use client";

import { invalidateDispatchWorkspace } from "@/components/dispatch-admin/dispatch-query-invalidation";
import { useDriversList } from "@/hooks/use-data-list";
import { useDispatchFilterParams } from "@/hooks/use-dispatch-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@gnd/ui/field";
import { Input } from "@gnd/ui/input";
import { Progress } from "@gnd/ui/progress";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Separator } from "@gnd/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { Textarea } from "@gnd/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, PackageCheck } from "lucide-react";
import { Controller } from "react-hook-form";
import { toast } from "sonner";

type Detail = RouterOutputs["dispatch"]["detail"];
type DispatchAddress = {
	name?: string | null;
	phoneNo?: string | null;
	address1?: string | null;
	address2?: string | null;
	city?: string | null;
	state?: string | null;
	meta?: { lat?: unknown; lng?: unknown; placeId?: unknown } | null;
};

function AssignmentForm({ detail }: { detail: Detail }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { setFilters } = useDispatchFilterParams();
	const drivers = useDriversList(true);
	const current = detail.overview.dispatch?.driver?.id || null;
	const mutation = useMutation(
		trpc.dispatch.updateDispatchDriver.mutationOptions({
			onSuccess() {
				invalidateDispatchWorkspace(queryClient, trpc);
				toast.success("Driver assignment updated");
				void setFilters({ sheetMode: "details" });
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	return (
		<div className="p-5">
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="assignment-driver">Driver</FieldLabel>
					<Select
						defaultValue={current ? String(current) : "unassigned"}
						onValueChange={(value) =>
							mutation.mutate({
								dispatchId: detail.overview.dispatch?.id || 0,
								oldDriverId: current,
								newDriverId: value === "unassigned" ? null : Number(value),
							})
						}
					>
						<SelectTrigger id="assignment-driver">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="unassigned">Unassigned</SelectItem>
								{drivers.map((driver) => (
									<SelectItem key={driver.id} value={String(driver.id)}>
										{driver.name || "Unnamed driver"}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
					<FieldDescription>
						Selecting a driver applies immediately.
					</FieldDescription>
				</Field>
			</FieldGroup>
		</div>
	);
}

function ScheduleForm({ detail }: { detail: Detail }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { setFilters } = useDispatchFilterParams();
	const current = detail.overview.dispatch?.dueDate;
	const mutation = useMutation(
		trpc.dispatch.updateDispatchDueDate.mutationOptions({
			onSuccess() {
				invalidateDispatchWorkspace(queryClient, trpc);
				toast.success("Schedule updated");
				void setFilters({ sheetMode: "details" });
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	return (
		<form
			className="p-5"
			onSubmit={(event) => {
				event.preventDefault();
				const formData = new FormData(event.currentTarget);
				const value = String(formData.get("dueDate") || "");
				if (!value) return;
				mutation.mutate({
					dispatchId: detail.overview.dispatch?.id || 0,
					oldDueDate: current ? new Date(current) : null,
					newDueDate: new Date(`${value}T12:00:00`),
				});
			}}
		>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="schedule-date">Delivery date</FieldLabel>
					<Input
						id="schedule-date"
						name="dueDate"
						type="date"
						defaultValue={
							current ? new Date(current).toISOString().slice(0, 10) : ""
						}
						required
					/>
				</Field>
			</FieldGroup>
			<Button className="mt-6" type="submit" disabled={mutation.isPending}>
				{mutation.isPending ? "Saving..." : "Save schedule"}
			</Button>
		</form>
	);
}

function ExceptionForm({ detail }: { detail: Detail }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { setFilters } = useDispatchFilterParams();
	const mutation = useMutation(
		trpc.dispatch.reportException.mutationOptions({
			onSuccess() {
				invalidateDispatchWorkspace(queryClient, trpc);
				toast.success("Exception reported");
				void setFilters({ sheetMode: "details", detailTab: "activity" });
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	return (
		<form
			className="flex flex-col gap-6 p-5"
			onSubmit={(event) => {
				event.preventDefault();
				const formData = new FormData(event.currentTarget);
				mutation.mutate({
					dispatchId: detail.overview.dispatch?.id || 0,
					reasonCode: String(formData.get("reasonCode")) as
						| "wrong_address"
						| "customer_not_home"
						| "damaged_items"
						| "access_issue"
						| "other",
					notes: String(formData.get("notes") || ""),
					requestId: crypto.randomUUID(),
				});
			}}
		>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="exception-reason">Reason</FieldLabel>
					<Select name="reasonCode" required>
						<SelectTrigger id="exception-reason">
							<SelectValue placeholder="Select the operational issue" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{[
									["wrong_address", "Wrong address"],
									["customer_not_home", "Customer not home"],
									["damaged_items", "Damaged items"],
									["access_issue", "Access issue"],
									["other", "Other"],
								].map(([value, label]) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>
				<Field>
					<FieldLabel htmlFor="exception-notes">Details</FieldLabel>
					<Textarea
						id="exception-notes"
						name="notes"
						maxLength={2000}
						placeholder="What happened and what should the office know?"
					/>
				</Field>
			</FieldGroup>
			<Button type="submit" disabled={mutation.isPending}>
				{mutation.isPending ? "Reporting..." : "Report exception"}
			</Button>
		</form>
	);
}

function ResolveExceptionForm({ detail }: { detail: Detail }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { filters, setFilters } = useDispatchFilterParams();
	const exception =
		detail.exceptions.find((item) => item.id === filters.exceptionId) ||
		detail.exceptions.find((item) => item.status === "open");
	const mutation = useMutation(
		trpc.dispatch.resolveException.mutationOptions({
			onSuccess() {
				invalidateDispatchWorkspace(queryClient, trpc);
				toast.success("Exception resolved");
				void setFilters({
					sheetMode: "details",
					detailTab: "activity",
					exceptionId: null,
				});
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	if (!exception)
		return (
			<Alert className="m-5">
				<AlertTriangle />
				<AlertTitle>No open exception</AlertTitle>
				<AlertDescription>
					This dispatch has no exception requiring resolution.
				</AlertDescription>
			</Alert>
		);
	return (
		<form
			className="flex flex-col gap-6 p-5"
			onSubmit={(event) => {
				event.preventDefault();
				const formData = new FormData(event.currentTarget);
				mutation.mutate({
					exceptionId: exception.id,
					resolutionNote: String(formData.get("resolutionNote") || ""),
					tripAction: "keep_assigned",
				});
			}}
		>
			<Alert>
				<AlertTriangle />
				<AlertTitle className="capitalize">
					{exception.reasonCode.replaceAll("_", " ")}
				</AlertTitle>
				<AlertDescription>
					{exception.notes || "No additional details were supplied."}
				</AlertDescription>
			</Alert>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="resolution-note">Resolution</FieldLabel>
					<Textarea
						id="resolution-note"
						name="resolutionNote"
						required
						minLength={3}
						maxLength={2000}
						placeholder="Record what was done and the next operational step."
					/>
				</Field>
			</FieldGroup>
			<Button type="submit" disabled={mutation.isPending}>
				{mutation.isPending ? "Resolving..." : "Resolve exception"}
			</Button>
		</form>
	);
}

function DetailContent({ detail }: { detail: Detail }) {
	const { filters, setFilters } = useDispatchFilterParams();
	const overview = detail.overview;
	const address = overview.address as DispatchAddress | null | undefined;
	const summary = overview.summary;
	const total = Math.max(1, summary.total);
	const packingPercent = Math.min(
		100,
		Math.round((summary.packed / total) * 100),
	);
	return (
		<div className="p-5">
			<Tabs
				value={filters.detailTab}
				onValueChange={(value) =>
					void setFilters({ detailTab: value as typeof filters.detailTab })
				}
			>
				<TabsList className="w-full justify-start overflow-x-auto">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="items">Items / Packing</TabsTrigger>
					<TabsTrigger value="route">Route / Contact</TabsTrigger>
					<TabsTrigger value="proof">Proof</TabsTrigger>
					<TabsTrigger value="activity">Activity</TabsTrigger>
				</TabsList>
				<TabsContent value="overview" className="flex flex-col gap-4 pt-4">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="rounded-xl border p-4">
							<p className="text-xs text-muted-foreground">Driver</p>
							<p className="mt-1 font-medium">
								{overview.dispatch?.driver?.name || "Unassigned"}
							</p>
						</div>
						<div className="rounded-xl border p-4">
							<p className="text-xs text-muted-foreground">Delivery date</p>
							<p className="mt-1 font-medium">
								{overview.dispatch?.dueDate
									? new Date(overview.dispatch.dueDate).toLocaleDateString()
									: "Unscheduled"}
							</p>
						</div>
					</div>
					{!overview.dispatchReadiness.canDispatch ? (
						<Alert>
							<AlertTriangle />
							<AlertTitle>Not ready to dispatch</AlertTitle>
							<AlertDescription>
								{overview.dispatchReadiness.reason}
							</AlertDescription>
						</Alert>
					) : (
						<Alert>
							<PackageCheck />
							<AlertTitle>Ready to load</AlertTitle>
							<AlertDescription>
								The manifest and inventory checks are ready for this trip.
							</AlertDescription>
						</Alert>
					)}
				</TabsContent>
				<TabsContent value="items" className="flex flex-col gap-4 pt-4">
					<div className="flex items-center justify-between gap-3 text-sm">
						<span>
							{summary.packed} of {summary.total} packed
						</span>
						<Badge variant="outline">{packingPercent}%</Badge>
					</div>
					<Progress value={packingPercent} />
					{overview.dispatchItems.map((item) => (
						<div key={item.uid} className="rounded-xl border p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-medium">{item.title}</p>
									<p className="text-xs text-muted-foreground">
										{item.subtitle}
									</p>
								</div>
								<Badge variant="outline">
									{item.inventoryReadiness.replaceAll("_", " ")}
								</Badge>
							</div>
						</div>
					))}
				</TabsContent>
				<TabsContent value="route" className="flex flex-col gap-4 pt-4">
					<div className="rounded-xl border p-4">
						<p className="font-medium">
							{address?.name ||
								overview.order.customer?.businessName ||
								overview.order.customer?.name ||
								"Customer"}
						</p>
						<p className="mt-1 text-sm text-muted-foreground">
							{[
								address?.address1,
								address?.address2,
								address?.city,
								address?.state,
							]
								.filter(Boolean)
								.join(", ") || "Address required"}
						</p>
						<p className="mt-2 text-sm">
							{address?.phoneNo ||
								overview.order.customer?.phoneNo ||
								"No phone"}
						</p>
					</div>
					{address?.meta &&
					typeof address.meta === "object" &&
					"lat" in address.meta &&
					"lng" in address.meta ? (
						<Button asChild variant="outline">
							<a
								href={`https://www.google.com/maps/dir/?api=1&destination=${String(address.meta.lat)},${String(address.meta.lng)}`}
								target="_blank"
								rel="noreferrer"
							>
								<ExternalLink data-icon="inline-start" />
								Open directions
							</a>
						</Button>
					) : null}
				</TabsContent>
				<TabsContent value="proof" className="pt-4">
					<Alert>
						<PackageCheck />
						<AlertTitle>Proof-bound completion</AlertTitle>
						<AlertDescription>
							Receiver, signature, and delivery photos are recorded by the
							driver completion workflow and remain retry-safe.
						</AlertDescription>
					</Alert>
				</TabsContent>
				<TabsContent value="activity" className="flex flex-col gap-3 pt-4">
					{detail.exceptions.length ? (
						detail.exceptions.map((exception) => (
							<div key={exception.id} className="rounded-xl border p-4">
								<div className="flex items-center justify-between gap-3">
									<p className="font-medium capitalize">
										{exception.reasonCode.replaceAll("_", " ")}
									</p>
									<Badge
										variant={
											exception.status === "open" ? "destructive" : "secondary"
										}
									>
										{exception.status}
									</Badge>
								</div>
								<p className="mt-2 text-sm text-muted-foreground">
									{exception.notes || "No additional details"}
								</p>
								{exception.resolutionNote ? (
									<>
										<Separator className="my-3" />
										<p className="text-sm">{exception.resolutionNote}</p>
									</>
								) : null}
							</div>
						))
					) : (
						<p className="text-sm text-muted-foreground">
							No dispatch exceptions have been recorded.
						</p>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}

export function DispatchContent({ detail }: { detail?: Detail }) {
	const { filters } = useDispatchFilterParams();
	return (
		<ScrollArea className="min-h-0 flex-1">
			{!detail ? (
				<div className="p-5 text-sm text-muted-foreground">
					Dispatch not found.
				</div>
			) : filters.sheetMode === "assign" ? (
				<AssignmentForm detail={detail} />
			) : filters.sheetMode === "schedule" ? (
				<ScheduleForm detail={detail} />
			) : filters.sheetMode === "exception" ? (
				<ExceptionForm detail={detail} />
			) : filters.sheetMode === "resolve" ? (
				<ResolveExceptionForm detail={detail} />
			) : (
				<DetailContent detail={detail} />
			)}
		</ScrollArea>
	);
}
