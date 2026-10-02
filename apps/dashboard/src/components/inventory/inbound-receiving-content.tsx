"use client";

import { DocumentUploader } from "@/components/common/document-uploader";
import { InboundNeedsApplicationActions } from "@/components/inventory/inbound-needs-application-actions";
import { formatInventoryInboundStatusLabel } from "@/components/sales-inbound-status-badge";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { InboundDemandAssignment } from "./inbound-demand-assignment";

import {
	formatLabel,
	getStatusTone,
	useInboundReceiving,
} from "./inbound-receiving-context";

export function InboundReceivingContent() {
	const state = useInboundReceiving();
	const auth = useAuth();
	const canEdit = Boolean(auth.can.editInboundOrder);
	const {
		selectedShipment: shipment,
		selectedShipmentQuery: query,
		receiveInputs,
		setReceiveInputs,
		receiveInboundMutation: receive,
		inboundDocuments,
		inboundDocumentsQuery,
		uploadDocumentsMutation,
		extractMutation,
		inboundExtractions,
		applyExtractionMutation,
		inboundActivity,
		issueResolutionInputs,
		setIssueResolutionInputs,
		resolveIssueMutation,
	} = state;
	if (query.isPending) return <p>Loading inbound…</p>;
	if (query.isError)
		return (
			<div role="alert">
				<p>{query.error.message}</p>
				<Button variant="outline" onClick={() => query.refetch()}>
					Retry
				</Button>
			</div>
		);
	if (!shipment) return <p>Inbound unavailable.</p>;
	const receivable =
		canEdit && !["closed", "cancelled"].includes(shipment.status);
	const valid =
		shipment.items.length > 0 &&
		shipment.items.every((item) => {
			const input = receiveInputs[item.id];
			if (!input) return false;
			const values = [input.qtyReceived, input.qtyGood, input.qtyIssue];
			return (
				values.every(
					(value) =>
						value.trim() !== "" &&
						Number.isFinite(Number(value)) &&
						Number(value) >= 0,
				) &&
				Math.abs(
					Number(input.qtyReceived) -
						Number(input.qtyGood) -
						Number(input.qtyIssue),
				) < 0.00001 &&
				Number(input.qtyGood) >= Number(item.qtyGood || 0) &&
				Number(input.qtyIssue) >= Number(item.qtyIssue || 0)
			);
		});
	return (
		<div className="space-y-6 pt-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<Badge variant="outline" className={getStatusTone(shipment.status)}>
						{formatInventoryInboundStatusLabel(shipment.status)}
					</Badge>
					<p className="mt-2 text-sm">
						{shipment.supplier?.name || "No supplier"}
					</p>
					<p className="text-sm text-muted-foreground">
						Reference {shipment.reference || "None"}
					</p>
				</div>
				<InboundNeedsApplicationActions
					inboundId={shipment.id}
					onChanged={() => state.refreshInboundData(shipment.id)}
				/>
			</div>
			{receivable ? <InboundDemandAssignment inboundId={shipment.id} /> : null}
			<section className="space-y-4 border-t pt-5">
				<div>
					<h3 className="font-medium">Receive stock</h3>
					<p className="text-sm text-muted-foreground">
						Enter cumulative totals received so far. Good plus issue must equal
						received. Posting the same totals again does not add stock twice.
					</p>
				</div>
				<fieldset
					disabled={!receivable || receive.isPending}
					className="space-y-5"
				>
					{shipment.items.map((item) => {
						const input = receiveInputs[item.id];
						const update = (patch: Partial<NonNullable<typeof input>>) =>
							setReceiveInputs((current) => ({
								...current,
								[item.id]: { ...input, ...patch },
							}));
						return (
							<div key={item.id} className="space-y-3 border-b pb-5">
								<div>
									<p className="text-sm font-medium">
										{item.inventoryVariant.inventory.name}
									</p>
									<p className="text-xs text-muted-foreground">
										{item.inventoryVariant.sku || item.inventoryVariant.uid} ·
										Expected {item.qty} · {item.location || "Default warehouse"}
									</p>
									<p className="text-xs text-muted-foreground">
										Already posted: {item.qtyGood || 0} good ·{" "}
										{item.qtyIssue || 0} issue
									</p>
								</div>
								<div className="grid gap-3 sm:grid-cols-3">
									{(
										[
											["qtyReceived", "Received"],
											["qtyGood", "Good"],
											["qtyIssue", "Issue"],
										] as const
									).map(([key, label]) => (
										<div key={key} className="space-y-1">
											<Label htmlFor={`receipt-${item.id}-${key}`}>
												{label}
											</Label>
											<Input
												id={`receipt-${item.id}-${key}`}
												type="number"
												min={0}
												step="any"
												value={input?.[key] || ""}
												onChange={(event) =>
													update({ [key]: event.target.value })
												}
											/>
										</div>
									))}
								</div>
								<div className="space-y-1">
									<Label htmlFor={`receipt-${item.id}-cost`}>Unit cost</Label>
									<Input
										id={`receipt-${item.id}-cost`}
										type="number"
										min={0}
										step="any"
										value={input?.unitPrice || ""}
										onChange={(event) =>
											update({ unitPrice: event.target.value })
										}
									/>
								</div>
								{Number(input?.qtyIssue || 0) > 0 ? (
									<div className="space-y-3">
										<Select
											value={input?.issueType || "damaged"}
											onValueChange={(value) =>
												update({
													issueType: value as NonNullable<
														typeof input
													>["issueType"],
												})
											}
										>
											<SelectTrigger
												aria-label={`Issue type for ${item.inventoryVariant.inventory.name}`}
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{[
													"damaged",
													"missing",
													"wrong_item",
													"over_received",
													"quality_hold",
												].map((value) => (
													<SelectItem key={value} value={value}>
														{formatLabel(value)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<Input
											aria-label={`Issue notes for ${item.inventoryVariant.inventory.name}`}
											placeholder="Issue notes"
											value={input?.issueNotes || ""}
											onChange={(event) =>
												update({ issueNotes: event.target.value })
											}
										/>
									</div>
								) : null}
							</div>
						);
					})}
					<Button
						disabled={!valid}
						onClick={() =>
							receive.mutate({
								inboundId: shipment.id,
								items: shipment.items.map((item) => {
									const input = receiveInputs[item.id];
									if (!input) throw new Error("Receipt totals are required.");
									return {
										inboundShipmentItemId: item.id,
										qtyReceived: Number(input.qtyReceived),
										qtyGood: Number(input.qtyGood),
										qtyIssue: Number(input.qtyIssue),
										unitPrice: input.unitPrice.trim()
											? Number(input.unitPrice)
											: null,
										issueType: input.issueType,
										issueNotes: input.issueNotes || null,
									};
								}),
							})
						}
					>
						{receive.isPending ? "Posting…" : "Post receipt"}
					</Button>
					{!valid && shipment.items.length ? (
						<p className="text-xs text-muted-foreground">
							Use valid totals at least as large as the quantities already
							posted.
						</p>
					) : null}
					{receive.isError ? (
						<p role="alert" className="text-sm text-destructive">
							{receive.error.message}
						</p>
					) : null}
				</fieldset>
			</section>
			<section className="space-y-4 border-t pt-5">
				<h3 className="font-medium">Documents</h3>
				{inboundDocumentsQuery.isError ? (
					<p role="alert">{inboundDocumentsQuery.error.message}</p>
				) : (
					inboundDocuments.map((document) => (
						<p key={document.id} className="text-sm">
							{document.url ? (
								<a
									href={document.url}
									target="_blank"
									rel="noreferrer"
									className="underline"
								>
									{document.title}
								</a>
							) : (
								document.title
							)}
						</p>
					))
				)}
				{canEdit ? (
					<DocumentUploader
						disabled={uploadDocumentsMutation.isPending}
						onUpload={async (input) => {
							const result = await uploadDocumentsMutation.mutateAsync({
								inboundId: shipment.id,
								...input,
							});
							return {
								documents: (result.documents || []).map((document) => ({
									...document,
									id: String(document.id),
									title: document.title || document.filename || "Document",
									pathname: document.pathname || "",
								})),
							};
						}}
					/>
				) : null}
				<Button
					variant="outline"
					disabled={
						!canEdit || !inboundDocuments.length || extractMutation.isPending
					}
					onClick={() => extractMutation.mutate({ inboundId: shipment.id })}
				>
					Extract document lines
				</Button>
				{extractMutation.isError ? (
					<p role="alert">{extractMutation.error.message}</p>
				) : null}
				{inboundExtractions.map((extraction) => (
					<div
						key={extraction.id}
						className="flex items-center justify-between gap-3 border-b py-2 text-sm"
					>
						<span>
							Extraction #{extraction.id} · {formatLabel(extraction.status)}
						</span>
						<Button
							variant="outline"
							size="sm"
							disabled={!canEdit || applyExtractionMutation.isPending}
							onClick={() =>
								applyExtractionMutation.mutate({
									inboundId: shipment.id,
									extractionId: extraction.id,
								})
							}
						>
							Apply extraction
						</Button>
					</div>
				))}
			</section>
			<section className="space-y-4 border-t pt-5">
				<h3 className="font-medium">Issues</h3>
				{shipment.items
					.flatMap((item) => item.issues)
					.map((issue) => {
						const input = issueResolutionInputs[issue.id];
						return (
							<div key={issue.id} className="space-y-3 border-b pb-4">
								<p className="text-sm">
									{formatLabel(issue.issueType)} · {issue.reportedQty} units ·{" "}
									{formatLabel(issue.status)}
								</p>
								{issue.status === "open" && canEdit ? (
									<>
										<Select
											value={input?.resolutionType || "replacement_requested"}
											onValueChange={(value) =>
												setIssueResolutionInputs((current) => ({
													...current,
													[issue.id]: {
														...input,
														resolutionType: value as NonNullable<
															typeof input
														>["resolutionType"],
													},
												}))
											}
										>
											<SelectTrigger aria-label="Issue resolution">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{[
													"return_to_supplier",
													"replacement_requested",
													"credit_requested",
													"write_off",
													"accepted_with_adjustment",
												].map((value) => (
													<SelectItem key={value} value={value}>
														{formatLabel(value)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<Input
											aria-label="Resolved quantity"
											type="number"
											min={0}
											max={issue.reportedQty}
											value={input?.resolvedQty || ""}
											onChange={(event) =>
												setIssueResolutionInputs((current) => ({
													...current,
													[issue.id]: {
														...input,
														resolvedQty: event.target.value,
													},
												}))
											}
										/>
										<Button
											variant="outline"
											disabled={
												resolveIssueMutation.isPending ||
												!input ||
												!Number.isFinite(Number(input.resolvedQty)) ||
												Number(input.resolvedQty) <= 0
											}
											onClick={() =>
												input &&
												resolveIssueMutation.mutate({
													issueId: issue.id,
													status: "resolved",
													resolutionType: input.resolutionType,
													resolvedQty: Number(input.resolvedQty),
													notes: input.notes,
												})
											}
										>
											Resolve issue
										</Button>
									</>
								) : null}
							</div>
						);
					})}
				{resolveIssueMutation.isError ? (
					<p role="alert">{resolveIssueMutation.error.message}</p>
				) : null}
			</section>
			<section className="space-y-3 border-t pt-5">
				<h3 className="font-medium">Activity</h3>
				{inboundActivity.length ? (
					inboundActivity.map((activity) => (
						<div key={activity.id} className="border-b py-2 text-sm">
							<p>{activity.subject}</p>
							<p className="text-muted-foreground">{activity.headline}</p>
						</div>
					))
				) : (
					<p className="text-sm text-muted-foreground">No activity yet.</p>
				)}
			</section>
		</div>
	);
}
