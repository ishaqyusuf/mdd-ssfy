"use client";

import { DocumentUploader } from "@/components/common/document-uploader";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Card } from "@gnd/ui/namespace";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Textarea } from "@gnd/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const statusToneClassName: Record<string, string> = {
	draft: "border-slate-200 bg-slate-100 text-slate-700",
	queued: "border-amber-200 bg-amber-50 text-amber-700",
	awaiting_documents: "border-amber-200 bg-amber-50 text-amber-700",
	ready_to_receive: "border-emerald-200 bg-emerald-50 text-emerald-700",
	partially_received: "border-blue-200 bg-blue-50 text-blue-700",
	received: "border-emerald-200 bg-emerald-100 text-emerald-800",
	completed: "border-emerald-200 bg-emerald-100 text-emerald-800",
	cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

type InboundIssueType =
	| "damaged"
	| "missing"
	| "wrong_item"
	| "over_received"
	| "quality_hold";

type InboundResolutionType =
	| "return_to_supplier"
	| "replacement_requested"
	| "credit_requested"
	| "write_off"
	| "accepted_with_adjustment";

function formatLabel(value: string | null | undefined) {
	return value ? value.replaceAll("_", " ") : "unknown";
}

function getStatusTone(status: string | null | undefined) {
	if (!status) return "border-slate-200 bg-slate-100 text-slate-700";
	return (
		statusToneClassName[status] ??
		"border-slate-200 bg-slate-100 text-slate-700"
	);
}

export function InboundReceivingPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [selectedInboundId, setSelectedInboundId] = useState<number | null>(
		null,
	);
	const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
	const [selectedDemandIds, setSelectedDemandIds] = useState<number[]>([]);
	const [receiveInputs, setReceiveInputs] = useState<
		Record<
			number,
			{
				qtyReceived: string;
				qtyGood: string;
				qtyIssue: string;
				unitPrice: string;
				issueType: InboundIssueType;
				issueNotes: string;
			}
		>
	>({});
	const [issueResolutionInputs, setIssueResolutionInputs] = useState<
		Record<
			number,
			{
				resolutionType: InboundResolutionType;
				resolvedQty: string;
				notes: string;
			}
		>
	>({});

	const suppliersQuery = useQuery(
		trpc.inventories.inboundSuppliers.queryOptions(),
	);
	const shipmentsQuery = useQuery(
		trpc.inventories.inboundShipments.queryOptions({}),
	);
	const demandQueueQuery = useQuery(
		trpc.inventories.inboundDemandQueue.queryOptions({}),
	);

	const shipments = shipmentsQuery.data ?? [];
	const suppliers = suppliersQuery.data ?? [];
	const demandQueue = demandQueueQuery.data ?? [];

	useEffect(() => {
		if (!shipments.length) return;
		if (
			selectedInboundId &&
			shipments.some((shipment) => shipment.id === selectedInboundId)
		) {
			return;
		}
		setSelectedInboundId(shipments[0]?.id ?? null);
	}, [shipments, selectedInboundId]);

	const selectedShipmentQuery = useQuery(
		trpc.inventories.inboundShipmentDetail.queryOptions(
			{
				inboundId: selectedInboundId ?? 0,
			},
			{
				enabled: !!selectedInboundId,
			},
		),
	);

	const inboundDocumentsQuery = useQuery(
		trpc.inventories.inboundDocuments.queryOptions(
			{
				inboundId: selectedInboundId ?? 0,
			},
			{
				enabled: !!selectedInboundId,
			},
		),
	);

	const inboundExtractionsQuery = useQuery(
		trpc.inventories.inboundExtractions.queryOptions(
			{
				inboundId: selectedInboundId ?? 0,
			},
			{
				enabled: !!selectedInboundId,
			},
		),
	);

	const inboundActivityQuery = useQuery(
		trpc.inventories.inboundActivity.queryOptions(
			{
				inboundId: selectedInboundId ?? 0,
			},
			{
				enabled: !!selectedInboundId,
			},
		),
	);

	const selectedShipment = selectedShipmentQuery.data ?? null;
	const inboundDocuments = inboundDocumentsQuery.data ?? [];
	const inboundExtractions = inboundExtractionsQuery.data ?? [];
	const inboundActivity = inboundActivityQuery.data ?? [];

	useEffect(() => {
		if (!selectedShipment?.items?.length) return;
		setReceiveInputs((current) => {
			const next = { ...current };
			for (const item of selectedShipment.items) {
				next[item.id] = next[item.id] || {
					qtyReceived: String(item.qty ?? ""),
					qtyGood: String(item.qtyGood ?? item.qty ?? ""),
					qtyIssue: String(item.qtyIssue ?? ""),
					unitPrice:
						item.unitPrice == null ? "" : String(Number(item.unitPrice || 0)),
					issueType: "damaged",
					issueNotes: "",
				};
			}
			return next;
		});
	}, [selectedShipment]);

	useEffect(() => {
		if (!selectedShipment?.items?.length) return;
		setIssueResolutionInputs((current) => {
			const next = { ...current };
			for (const item of selectedShipment.items) {
				for (const issue of item.issues || []) {
					next[issue.id] = next[issue.id] || {
						resolutionType: "replacement_requested",
						resolvedQty: String(issue.reportedQty ?? ""),
						notes: issue.notes || "",
					};
				}
			}
			return next;
		});
	}, [selectedShipment]);

	const refreshInboundData = async (inboundId?: number | null) => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inboundShipments.queryKey({}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inboundDemandQueue.queryKey({}),
			}),
			inboundId
				? queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundShipmentDetail.queryKey({
							inboundId,
						}),
					})
				: Promise.resolve(),
			inboundId
				? queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundDocuments.queryKey({
							inboundId,
						}),
					})
				: Promise.resolve(),
			inboundId
				? queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundExtractions.queryKey({
							inboundId,
						}),
					})
				: Promise.resolve(),
			inboundId
				? queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundActivity.queryKey({
							inboundId,
						}),
					})
				: Promise.resolve(),
		]);
	};

	const createInboundMutation = useMutation(
		trpc.inventories.createInboundShipment.mutationOptions({
			onSuccess(data) {
				setSelectedInboundId(data.id);
				toast.success(`Inbound #${data.id} created`);
				refreshInboundData(data.id);
			},
		}),
	);

	const createFromDemandsMutation = useMutation(
		trpc.inventories.createInboundShipmentFromDemands.mutationOptions({
			onSuccess(data) {
				setSelectedInboundId(data.inboundId);
				setSelectedDemandIds([]);
				toast.success(`Inbound #${data.inboundId} created from demand`);
				refreshInboundData(data.inboundId);
			},
		}),
	);

	const assignDemandsMutation = useMutation(
		trpc.inventories.assignInboundDemands.mutationOptions({
			onSuccess() {
				setSelectedDemandIds([]);
				toast.success("Demand linked to inbound");
				refreshInboundData(selectedInboundId);
			},
		}),
	);

	const extractMutation = useMutation(
		trpc.inventories.extractInboundDocuments.mutationOptions({
			onSuccess() {
				toast.success("Extraction finished");
				refreshInboundData(selectedInboundId);
			},
			onError(error) {
				toast.error(error.message || "Extraction failed");
			},
		}),
	);

	const uploadDocumentsMutation = useMutation(
		trpc.inventories.uploadInboundDocuments.mutationOptions({
			onSuccess() {
				toast.success("Inbound documents uploaded");
				refreshInboundData(selectedInboundId);
			},
			onError(error) {
				toast.error(error.message || "Unable to upload inbound documents");
			},
		}),
	);

	const applyExtractionMutation = useMutation(
		trpc.inventories.applyInboundExtraction.mutationOptions({
			onSuccess() {
				toast.success("Extraction applied to inbound items");
				refreshInboundData(selectedInboundId);
			},
		}),
	);

	const receiveInboundMutation = useMutation(
		trpc.inventories.receiveInboundShipment.mutationOptions({
			onSuccess() {
				toast.success("Inbound receipt posted to stock");
				refreshInboundData(selectedInboundId);
			},
		}),
	);
	const resolveIssueMutation = useMutation(
		trpc.inventories.resolveInboundItemIssue.mutationOptions({
			onSuccess() {
				toast.success("Inbound issue resolved");
				refreshInboundData(selectedInboundId);
			},
		}),
	);

	const selectedDemandRows = useMemo(
		() => demandQueue.filter((row) => selectedDemandIds.includes(row.id)),
		[demandQueue, selectedDemandIds],
	);
	const shipmentSummary = useMemo(
		() => ({
			total: shipments.length,
			active: shipments.filter(
				(shipment) =>
					shipment.status !== "received" &&
					shipment.status !== "completed" &&
					shipment.status !== "cancelled",
			).length,
			documents: shipments.reduce(
				(sum, shipment) => sum + Number(shipment.documentCount || 0),
				0,
			),
			items: shipments.reduce(
				(sum, shipment) => sum + Number(shipment.itemCount || 0),
				0,
			),
		}),
		[shipments],
	);

	return (
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
			<Card className="p-4 space-y-4 xl:min-w-0">
				<div className="flex items-center justify-between gap-3">
					<div>
						<h3 className="text-sm font-semibold">Inbound Shipments</h3>
						<p className="text-xs text-slate-500">
							Snap receipt, extract invoice lines, then receive into stock.
						</p>
					</div>
				</div>

				<div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
					<div className="space-y-4">
						<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
							<div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
								<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
									Total Inbounds
								</p>
								<p className="mt-2 text-2xl font-semibold text-slate-900">
									{shipmentSummary.total}
								</p>
								<p className="mt-1 text-xs text-slate-500">
									{shipmentSummary.active} still active in the receiving queue.
								</p>
							</div>
							<div className="rounded-2xl border border-slate-200 bg-white p-4">
								<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
									Coverage
								</p>
								<div className="mt-2 grid grid-cols-2 gap-3">
									<div>
										<p className="text-lg font-semibold text-slate-900">
											{shipmentSummary.documents}
										</p>
										<p className="text-[11px] uppercase tracking-wide text-slate-500">
											Docs
										</p>
									</div>
									<div>
										<p className="text-lg font-semibold text-slate-900">
											{shipmentSummary.items}
										</p>
										<p className="text-[11px] uppercase tracking-wide text-slate-500">
											Items
										</p>
									</div>
								</div>
							</div>
						</div>

						<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
							<div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
								<p className="text-sm font-semibold text-slate-900">
									Shipment Queue
								</p>
								<p className="text-xs text-slate-500">
									Pick an inbound to review documents and receive stock.
								</p>
							</div>
							{shipments.length ? (
								<ScrollArea className="h-[520px]">
									<div className="space-y-2 p-3">
										{shipments.map((shipment) => {
											const isSelected = selectedInboundId === shipment.id;
											return (
												<button
													key={shipment.id}
													type="button"
													onClick={() => setSelectedInboundId(shipment.id)}
													className={`w-full rounded-2xl border p-4 text-left transition-colors ${
														isSelected
															? "border-slate-900 bg-slate-50 shadow-sm"
															: "border-slate-200 bg-white hover:bg-slate-50"
													}`}
												>
													<div className="flex items-start justify-between gap-3">
														<div className="min-w-0">
															<p className="text-sm font-semibold text-slate-900">
																Inbound #{shipment.id}
															</p>
															<p className="truncate text-xs text-slate-500">
																{shipment.supplier.name}
															</p>
														</div>
														<Badge
															variant="outline"
															className={`shrink-0 border capitalize ${getStatusTone(shipment.status)}`}
														>
															{formatLabel(shipment.status)}
														</Badge>
													</div>
													<div className="mt-4 grid grid-cols-3 gap-2">
														<div className="rounded-xl bg-slate-50 px-3 py-2">
															<p className="text-base font-semibold text-slate-900">
																{shipment.documentCount}
															</p>
															<p className="text-[11px] uppercase tracking-wide text-slate-500">
																Docs
															</p>
														</div>
														<div className="rounded-xl bg-slate-50 px-3 py-2">
															<p className="text-base font-semibold text-slate-900">
																{shipment.itemCount}
															</p>
															<p className="text-[11px] uppercase tracking-wide text-slate-500">
																Items
															</p>
														</div>
														<div className="rounded-xl bg-slate-50 px-3 py-2">
															<p className="text-base font-semibold text-slate-900">
																{shipment.extractionCount}
															</p>
															<p className="text-[11px] uppercase tracking-wide text-slate-500">
																AI
															</p>
														</div>
													</div>
												</button>
											);
										})}
									</div>
								</ScrollArea>
							) : (
								<div className="p-6">
									<div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
										No inbound shipments yet. Create one from the receiving tray
										to start.
									</div>
								</div>
							)}
						</div>
					</div>

					<div className="space-y-6">
						{selectedShipment ? (
							<>
								<div className="space-y-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100/70 p-5">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<div className="flex flex-wrap items-center gap-2">
												<h4 className="text-lg font-semibold text-slate-900">
													Inbound #{selectedShipment.id}
												</h4>
												<Badge
													variant="outline"
													className={`border capitalize ${getStatusTone(selectedShipment.status)}`}
												>
													{formatLabel(selectedShipment.status)}
												</Badge>
											</div>
											<p className="mt-1 text-sm font-medium text-slate-700">
												{selectedShipment.supplier.name}
											</p>
											<p className="text-sm text-slate-500">
												Reference {selectedShipment.reference || "None on file"}
											</p>
										</div>
										<Button
											variant="outline"
											onClick={() => {
												if (!selectedDemandIds.length) {
													toast.error("Select demand rows to assign");
													return;
												}
												assignDemandsMutation.mutate({
													inboundId: selectedShipment.id,
													demandIds: selectedDemandIds,
												});
											}}
											disabled={assignDemandsMutation.isPending}
										>
											Assign Selected Orders
										</Button>
									</div>

									<div className="grid gap-3 sm:grid-cols-3">
										<div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
											<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
												Documents
											</p>
											<p className="mt-2 text-xl font-semibold text-slate-900">
												{inboundDocuments.length}
											</p>
										</div>
										<div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
											<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
												Extractions
											</p>
											<p className="mt-2 text-xl font-semibold text-slate-900">
												{inboundExtractions.length}
											</p>
										</div>
										<div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
											<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
												Receiving Lines
											</p>
											<p className="mt-2 text-xl font-semibold text-slate-900">
												{selectedShipment.items.length}
											</p>
										</div>
									</div>

									{selectedDemandRows.length ? (
										<div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
											<span className="font-medium text-slate-900">
												Pending assignment:
											</span>{" "}
											{selectedDemandRows
												.map(
													(row) => row.lineItemComponent.parent.sale?.orderId,
												)
												.filter(Boolean)
												.join(", ") ||
												`${selectedDemandRows.length} demand rows`}
										</div>
									) : (
										<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
											Select rows in the receiving tray to assign linked order
											demand to this inbound.
										</div>
									)}
								</div>
							</>
						) : (
							<div className="rounded-2xl border border-dashed p-6 text-sm text-slate-500">
								Create or select an inbound to start receiving.
							</div>
						)}
					</div>
				</div>
			</Card>

			<div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
				<Card className="p-4 space-y-4">
					<div className="space-y-1">
						<h3 className="text-sm font-semibold">Receiving Tray</h3>
						<p className="text-xs text-slate-500">
							Open shortage demand that still needs inbound coverage.
						</p>
					</div>

					<div className="space-y-3 rounded-xl border p-3">
						<Select
							value={selectedSupplierId}
							onValueChange={setSelectedSupplierId}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select supplier" />
							</SelectTrigger>
							<SelectContent>
								{suppliers.map((supplier) => (
									<SelectItem key={supplier.id} value={String(supplier.id)}>
										{supplier.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<div className="flex gap-2">
							<Button
								className="flex-1"
								onClick={() => {
									if (!selectedSupplierId) {
										toast.error("Select a supplier first");
										return;
									}
									createInboundMutation.mutate({
										supplierId: Number(selectedSupplierId),
									});
								}}
								disabled={createInboundMutation.isPending}
							>
								New Inbound
							</Button>
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => {
									if (!selectedSupplierId) {
										toast.error("Select a supplier first");
										return;
									}
									if (!selectedDemandIds.length) {
										toast.error("Select demand rows to create inbound from");
										return;
									}
									createFromDemandsMutation.mutate({
										supplierId: Number(selectedSupplierId),
										demandIds: selectedDemandIds,
									});
								}}
								disabled={createFromDemandsMutation.isPending}
							>
								Create From Demand
							</Button>
						</div>
					</div>

					<div className="space-y-2">
						{demandQueue.map((row) => {
							const checked = selectedDemandIds.includes(row.id);
							const orderNo = row.lineItemComponent.parent.sale?.orderId;
							return (
								<label
									key={row.id}
									className="flex cursor-pointer items-start gap-3 rounded-xl border p-3"
								>
									<input
										type="checkbox"
										checked={checked}
										onChange={(event) => {
											setSelectedDemandIds((current) =>
												event.target.checked
													? [...current, row.id]
													: current.filter((id) => id !== row.id),
											);
										}}
									/>
									<div className="min-w-0 flex-1">
										<div className="flex items-center justify-between gap-2">
											<p className="truncate text-sm font-medium">
												{row.inventoryVariant.inventory.name}
											</p>
											<span className="text-xs uppercase text-slate-500">
												{row.status.replaceAll("_", " ")}
											</span>
										</div>
										<p className="text-xs text-slate-500">
											{orderNo ? `Order ${orderNo}` : "Unassigned order"}
										</p>
										<p className="text-xs text-slate-500">
											Need {Number(row.qty || 0)} / received{" "}
											{Number(row.qtyReceived || 0)}
										</p>
									</div>
								</label>
							);
						})}
					</div>
				</Card>

				<Card className="p-4 space-y-4">
					<div>
						<h3 className="text-sm font-semibold">Inbound Activity</h3>
						<p className="text-xs text-slate-500">
							Receipt uploads, extraction, assignment, and receiving timeline.
						</p>
					</div>
					<div className="space-y-3">
						{inboundActivity.map((activity) => (
							<div key={activity.id} className="rounded-xl border p-3">
								<p className="text-sm font-medium">{activity.subject}</p>
								<p className="text-xs text-slate-500">{activity.headline}</p>
								{activity.documents?.length ? (
									<p className="pt-2 text-xs text-slate-500">
										Documents:{" "}
										{activity.documents
											.map((document) => document?.title)
											.join(", ")}
									</p>
								) : null}
							</div>
						))}
						{!inboundActivity.length ? (
							<p className="text-sm text-slate-500">No activity yet.</p>
						) : null}
					</div>
				</Card>
			</div>
		</div>
	);
}
