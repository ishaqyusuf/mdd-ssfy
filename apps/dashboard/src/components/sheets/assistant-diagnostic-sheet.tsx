"use client";

import { useAssistantDiagnosticParams } from "@/hooks/use-assistant-diagnostic-params";
import { useTRPC } from "@/trpc/client";
import { assistantMonitoringLink } from "@api/assistant/monitoring-link";
import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Textarea } from "@gnd/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { useState } from "react";
import { CustomSheet, CustomSheetContent } from "./custom-sheet-content";
import { AssistantDiagnosticUiGate } from "../assistant/assistant-diagnostic-ui-gate";

export function AssistantDiagnosticSheet() {
	return <AssistantDiagnosticUiGate><AssistantDiagnosticDetail /></AssistantDiagnosticUiGate>;
}

function AssistantDiagnosticDetail() {
	const { reference, setReference } = useAssistantDiagnosticParams();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<
		"new" | "investigating" | "resolved" | null
	>(null);
	const [note, setNote] = useState("");
	const query = useQuery(
		trpc.assistant.diagnostic.queryOptions(
			{ reference: reference ?? "" },
			{ enabled: Boolean(reference), retry: false },
		),
	);
	const review = useMutation(
		trpc.assistant.reviewDiagnostic.mutationOptions({
			onSuccess: async () => {
				setNote("");
				setStatus(null);
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.assistant.diagnostic.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.assistant.diagnostics.queryKey(),
					}),
				]);
			},
		}),
	);
	const data = query.data;
	const monitoringLink = assistantMonitoringLink(data?.details);
	return (
		<CustomSheet
			sheetName="assistant-diagnostic"
			open={Boolean(reference)}
			size="lg"
			rounded
			floating
			onOpenChange={(open) => {
				if (!open) void setReference(null);
			}}
		>
			<SheetHeader>
				<SheetTitle>Assistant diagnostic</SheetTitle>
			</SheetHeader>
			<CustomSheetContent>
				{query.isPending ? (
					<p role="status">Loading diagnostic…</p>
				) : query.isError ? (
					<p role="alert">
						This diagnostic is unavailable or you don't have access.
					</p>
				) : data ? (
					<div className="space-y-6 py-5">
						<section className="space-y-2">
							<h3 className="font-medium">What the user saw</h3>
							<p>{data.publicMessage}</p>
							<p className="text-xs text-muted-foreground">
								{data.reference} · {new Date(data.createdAt).toLocaleString()}
							</p>
						</section>
						<dl className="grid grid-cols-2 gap-3 text-sm">
							{Object.entries({
								Stage: data.stage,
								Operation: data.operation,
								Code: data.code,
								Outcome: data.outcome,
								Provider: data.provider,
								Model: data.model,
								Environment: data.environment,
								Release: data.release,
								Request: data.requestId,
								Run: data.runId,
								"Tool call": data.toolCallId,
							}).map(([label, value]) => (
								<div key={label}>
									<dt className="text-muted-foreground">{label}</dt>
									<dd className="break-all">{value ?? "Not available"}</dd>
								</div>
							))}
						</dl>
						<section>
							<h3 className="mb-2 font-medium">Technical context</h3>
							{monitoringLink ? <a className="mb-3 inline-block text-sm underline" href={monitoringLink} target="_blank" rel="noopener noreferrer">Find event in Sentry</a> : null}
							<pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
								{JSON.stringify(data.details, null, 2)}
							</pre>
						</section>
						<section>
							<h3 className="mb-2 font-medium">Execution timeline</h3>
							{data.timeline.length ? (
								<ol className="space-y-2 text-sm">
									{data.timeline.map((step, index) => (
										<li key={`${step.toolId}-${index}`}>
											{step.toolId} · {step.status} · {step.durationMs ?? 0} ms
											{step.errorCode ? ` · ${step.errorCode}` : ""}
										</li>
									))}
								</ol>
							) : (
								<p className="text-sm text-muted-foreground">
									No execution steps recorded.
								</p>
							)}
						</section>
						<section>
							<h3 className="mb-2 font-medium">Conversation</h3>
							{data.conversation ? (
								<a
									className="text-sm underline"
									href={`/assistant?chat=${encodeURIComponent(data.conversation.id)}`}
								>
									{data.conversation.title || "Open conversation"}
								</a>
							) : (
								<p className="text-sm text-muted-foreground">
									Context unavailable.
								</p>
							)}
						</section>
						<form
							className="space-y-3 border-t pt-5"
							onSubmit={(event) => {
								event.preventDefault();
								if (reference)
									review.mutate({
										reference,
										status:
											status ??
											(data.status === "resolved"
												? "resolved"
												: data.status === "investigating"
													? "investigating"
													: "new"),
										note,
									});
							}}
						>
							<Label htmlFor="diagnostic-review-status">Review status</Label>
							<Select
								value={status ?? data.status}
								onValueChange={(value) => {
									if (
										value === "new" ||
										value === "investigating" ||
										value === "resolved"
									)
										setStatus(value);
								}}
							>
								<SelectTrigger id="diagnostic-review-status">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{["new", "investigating", "resolved"].map((value) => (
										<SelectItem key={value} value={value}>
											{value}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Label htmlFor="diagnostic-review-note">Developer note</Label>
							<Textarea
								id="diagnostic-review-note"
								value={note}
								onChange={(event) => setNote(event.target.value)}
								maxLength={2000}
								placeholder="Describe your investigation. Leave out credentials and customer details."
							/>
							{review.isError ? (
								<p role="alert" className="text-sm">
									The review couldn't be saved. Please try again.
								</p>
							) : null}
							<Button type="submit" disabled={review.isPending}>
								{review.isPending ? "Saving…" : "Save review"}
							</Button>
						</form>
						<section>
							<h3 className="mb-2 font-medium">Review history</h3>
							<ol className="space-y-3 text-sm">
								{data.reviews.map((item) => (
									<li key={item.id}>
										<p>
											{item.fromStatus} → {item.status} ·{" "}
											{new Date(item.createdAt).toLocaleString()} · Reviewer{" "}
											{item.reviewerId}
										</p>
										{item.note ? (
											<p className="mt-1 whitespace-pre-wrap text-muted-foreground">
												{item.note}
											</p>
										) : null}
									</li>
								))}
							</ol>
						</section>
					</div>
				) : null}
			</CustomSheetContent>
		</CustomSheet>
	);
}
