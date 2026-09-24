"use client";

import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CustomModal } from "./custom-modal";

function dateLabel(value: Date | string | null | undefined) {
	return value ? format(new Date(value), "MMM d, yyyy") : "Not set";
}

function requestTitle(description: string | null | undefined, id: number) {
	const firstLine = description
		?.trim()
		.split(/[.!?(\n]/, 1)[0]
		?.trim();
	if (!firstLine) return `Work order #${id}`;
	if (firstLine.length <= 80) return firstLine;
	return `${firstLine.slice(0, 77).trimEnd()}…`;
}

function Detail({
	label,
	value,
}: {
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div>
			<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<div className="mt-1 text-sm font-medium text-foreground">
				{value || "Not set"}
			</div>
		</div>
	);
}

export function WorkOrderOverviewModal() {
	const { openCustomerServiceOverviewId, setParams } =
		useCustomerServiceParams();
	const id = openCustomerServiceOverviewId ?? 0;
	const trpc = useTRPC();
	const { data, isPending, isError, error, refetch } = useQuery(
		trpc.community.workOrder.form.queryOptions(id, {
			enabled: id > 0,
			staleTime: 60_000,
		}),
	);
	const { data: assignees } = useQuery(
		trpc.customerService.getAssignees.queryOptions(undefined, {
			enabled: id > 0,
			staleTime: 60_000,
		}),
	);

	return (
		<CustomModal
			open={id > 0}
			onOpenChange={(open) => {
				if (!open) void setParams({ openCustomerServiceOverviewId: null });
			}}
			title="Work order overview"
			description="Review the request, customer, and appointment."
			size="4xl"
			className="max-h-[92dvh] md:w-[min(900px,calc(100vw-48px))]"
		>
			<CustomModal.Content className="max-h-[calc(92dvh-150px)]">
				{isPending ? (
					<div
						className="space-y-5 py-4"
						aria-label="Loading work order overview"
					>
						<Skeleton className="h-7 w-2/3" />
						<Skeleton className="h-28 w-full" />
						<div className="grid gap-4 md:grid-cols-2">
							<Skeleton className="h-32" />
							<Skeleton className="h-32" />
						</div>
					</div>
				) : null}
				{isError || (!isPending && !data) ? (
					<div className="space-y-3 py-10 text-center">
						<p className="text-sm text-muted-foreground">
							This work order could not be loaded.
						</p>
						{error ? (
							<p className="text-xs text-muted-foreground">{error.message}</p>
						) : null}
						<Button variant="outline" onClick={() => void refetch()}>
							Try again
						</Button>
					</div>
				) : null}
				{data ? (
					<div className="space-y-6 py-4">
						<div className="flex flex-wrap items-start justify-between gap-3 border-b pb-5">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Customer Service / Work order #{data.id}
								</p>
								<h2 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">
									{requestTitle(data.description, data.id)}
								</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									{[data.projectName, data.homeOwner]
										.filter(Boolean)
										.join(" · ") || "No customer listed"}
								</p>
							</div>
							<span className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-800 dark:bg-blue-950 dark:text-blue-200">
								{data.status || "Unspecified"}
							</span>
						</div>
						<div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.9fr)]">
							<div className="space-y-4">
								<section className="rounded-xl border border-l-4 border-l-primary bg-muted/20 p-5">
									<h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
										What needs attention
									</h3>
									<p className="mt-3 whitespace-pre-wrap text-sm leading-6">
										{data.description || "No description provided"}
									</p>
								</section>
								<div className="grid gap-4 sm:grid-cols-2">
									<section className="rounded-xl border p-5">
										<Detail label="Customer" value={data.homeOwner} />
										<p className="mt-2 text-xs text-muted-foreground">
											{data.homePhone || "No phone number"}
										</p>
									</section>
									<section className="rounded-xl border p-5">
										<Detail
											label="Location"
											value={data.projectName || "Custom"}
										/>
										<p className="mt-2 text-xs text-muted-foreground">
											{[
												data.lot && `Lot ${data.lot}`,
												data.block && `Block ${data.block}`,
											]
												.filter(Boolean)
												.join(" · ") ||
												data.homeAddress ||
												"No unit details"}
										</p>
									</section>
								</div>
								{data.homeAddress ? (
									<Detail label="Address" value={data.homeAddress} />
								) : null}
							</div>
							<aside className="space-y-5 border-t pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
								<Detail
									label="Appointment"
									value={dateLabel(data.scheduleDate)}
								/>
								<Detail label="Time" value={data.scheduleTime} />
								<Detail
									label="Assigned to"
									value={
										assignees?.find((person) => person.id === data.techId)
											?.name || "Unassigned"
									}
								/>
								<div className="rounded-xl border bg-muted/30 p-4">
									<Detail label="Status" value={data.status} />
								</div>
								<Detail label="Requested" value={dateLabel(data.requestDate)} />
								<Detail label="Created" value={dateLabel(data.createdAt)} />
							</aside>
						</div>
					</div>
				) : null}
			</CustomModal.Content>
			<div className="flex items-center justify-between gap-3 border-t px-4 py-3">
				<p className="hidden text-xs text-muted-foreground sm:block">
					Details are read only until you choose Edit.
				</p>
				<div className="ml-auto flex gap-2">
					<Button
						variant="outline"
						onClick={() =>
							void setParams({ openCustomerServiceOverviewId: null })
						}
					>
						Close
					</Button>
					<Button
						disabled={!data}
						onClick={() =>
							void setParams({
								openCustomerServiceOverviewId: null,
								openCustomerServiceId: id,
							})
						}
					>
						Edit work order
					</Button>
				</div>
			</div>
		</CustomModal>
	);
}
