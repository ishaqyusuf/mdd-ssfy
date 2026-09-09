"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function ReliabilityReview() {
	const trpc = useTRPC();
	const services = useQuery(trpc.reliability.services.queryOptions());
	const [selected, setSelected] = useState("");
	const serviceId = services.data?.serviceIds.includes(selected)
		? selected
		: services.data?.serviceIds[0];
	if (services.isPending) return <output>Loading reliability access…</output>;
	if (services.isError)
		return (
			<p role="alert">
				Unable to load reliability access.{" "}
				<Button onClick={() => services.refetch()}>Retry</Button>
			</p>
		);
	if (!serviceId)
		return <p>No reliability services are assigned to your account.</p>;
	return (
		<div className="space-y-6">
			<label className="flex items-center gap-3">
				Service
				<select
					className="rounded border bg-background p-2"
					value={serviceId}
					onChange={(event) => setSelected(event.target.value)}
				>
					{services.data.serviceIds.map((id) => (
						<option key={id} value={id}>
							{id}
						</option>
					))}
				</select>
			</label>
			<IncidentList key={serviceId} serviceId={serviceId} />
		</div>
	);
}

function IncidentList({ serviceId }: { serviceId: string }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [cursor, setCursor] = useState<string>();
	const [selected, setSelected] = useState<{
		incidentId: string;
		revision: number;
	}>();
	const list = useQuery(
		trpc.reliability.list.queryOptions({ serviceId, cursor }),
	);
	return (
		<div className="space-y-4">
			<div className="flex gap-2">
				<Button
					variant="outline"
					onClick={() => {
						setCursor(undefined);
						setSelected(undefined);
						void queryClient.invalidateQueries({
							queryKey: trpc.reliability.list.pathKey(),
						});
					}}
				>
					Refresh list
				</Button>
			</div>
			{list.isPending && <output>Loading incidents…</output>}
			{list.isError && (
				<p role="alert">
					Unable to load incidents. Check your access or retry.
				</p>
			)}
			{list.data && !list.isError && (
				<>
					{list.data.items.length === 0 && <p>No incidents on this page.</p>}
					<ul className="divide-y rounded border">
						{list.data.items.map((incident) => (
							<li
								key={incident.id}
								className="flex flex-wrap items-center justify-between gap-3 p-4"
							>
								<div>
									<p className="font-medium">
										{incident.severity} · {incident.status}
									</p>
									<p className="break-all text-sm text-muted-foreground">
										{incident.id} · {incident.occurrenceCount} recorded events ·
										Owner: {incident.owner}
									</p>
								</div>
								<Button
									variant="outline"
									onClick={() =>
										setSelected({
											incidentId: incident.id,
											revision: incident.revision,
										})
									}
								>
									Review draft
								</Button>
							</li>
						))}
					</ul>
					{list.data.nextCursor && (
						<Button
							onClick={() => {
								setSelected(undefined);
								setCursor(list.data.nextCursor ?? undefined);
							}}
						>
							Next page
						</Button>
					)}
				</>
			)}
			{selected && (
				<IncidentPreview
					key={`${selected.incidentId}:${selected.revision}`}
					serviceId={serviceId}
					{...selected}
				/>
			)}
		</div>
	);
}

function IncidentPreview(input: {
	serviceId: string;
	incidentId: string;
	revision: number;
}) {
	const trpc = useTRPC();
	const preview = useQuery(trpc.reliability.preview.queryOptions(input));
	if (preview.isPending) return <output>Preparing draft…</output>;
	if (preview.isError)
		return (
			<p role="alert">
				Unable to load this draft.{" "}
				<Button onClick={() => preview.refetch()}>Retry</Button>
			</p>
		);
	if (preview.data.status === "not_available")
		return (
			<output>
				This incident has changed or is unavailable. Refresh the list and select
				it again.
			</output>
		);
	if (preview.data.status === "informational")
		return <p>This incident is informational and has no ticket draft.</p>;
	return (
		<section
			aria-label="Incident draft"
			className="space-y-3 rounded border p-4"
		>
			<h2 className="text-lg font-semibold">{preview.data.title}</h2>
			<p className="text-sm text-muted-foreground">
				Review only. Publication is not enabled from this screen.
			</p>
			<pre className="whitespace-pre-wrap break-words font-sans text-sm">
				{preview.data.evidence}
			</pre>
		</section>
	);
}
