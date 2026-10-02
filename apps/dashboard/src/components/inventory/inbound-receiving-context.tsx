"use client";

import { useInventoryInboundFilterParams } from "@/hooks/use-inventory-inbound-filter-params";
import { useInventoryInboundParams } from "@/hooks/use-inventory-inbound-params";
import { useTRPC } from "@/trpc/client";

import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { type ReactNode, createContext, useContext } from "react";
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

export function formatLabel(value: string | null | undefined) {
	return value ? value.replaceAll("_", " ") : "unknown";
}

export function getStatusTone(status: string | null | undefined) {
	if (!status) return "border-slate-200 bg-slate-100 text-slate-700";
	return (
		statusToneClassName[status] ??
		"border-slate-200 bg-slate-100 text-slate-700"
	);
}

function useInboundController() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const {
		inboundId: selectedInboundId,
		inboundQueue,
		setParams,
	} = useInventoryInboundParams();
	const setSelectedInboundId = (inboundId: number | null) => {
		void setParams({ inboundId });
	};
	const suppliersQuery = useQuery(
		trpc.inventories.inboundSuppliers.queryOptions(undefined, {
			enabled: Boolean(inboundQueue || selectedInboundId),
			refetchOnWindowFocus: false,
			staleTime: 60 * 1000,
		}),
	);
	const { filters } = useInventoryInboundFilterParams();
	const shipmentsQuery = useInfiniteQuery(
		trpc.inventories.inboundShipments.infiniteQueryOptions(
			{
				limit: 50,
				q: filters.inboundSearch,
				status: filters.inboundStatus ? [filters.inboundStatus] : undefined,
			},
			{
				getNextPageParam: (page) =>
					page.length === 50 ? page.at(-1)?.id : undefined,
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
			},
		),
	);
	const demandQueueQuery = useQuery(
		trpc.inventories.inboundDemandQueue.queryOptions(
			{},
			{
				enabled: Boolean(inboundQueue || selectedInboundId),
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
			},
		),
	);
	const reorderSuggestionsQuery = useQuery(
		trpc.inventories.supplierReorderSuggestions.queryOptions(undefined, {
			enabled: Boolean(inboundQueue),
			refetchOnWindowFocus: false,
			staleTime: 60 * 1000,
		}),
	);
	const inboundReconciliationQuery = useQuery(
		trpc.inventories.inboundStatusDemandReconciliation.queryOptions(
			{
				take: 50,
			},
			{
				enabled: Boolean(inboundQueue),
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
			},
		),
	);
	const shipments = shipmentsQuery.data?.pages.flat() ?? [];
	const suppliers = suppliersQuery.data ?? [];
	const demandQueue = demandQueueQuery.data ?? [];
	const inboundReconciliation = inboundReconciliationQuery.data ?? null;
	const reorderSuggestions = reorderSuggestionsQuery.data?.suggestions ?? [];
	const reorderSummary = reorderSuggestionsQuery.data?.summary;

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

	const selectedShipmentQuery = useQuery(
		trpc.inventories.inboundShipmentDetail.queryOptions(
			{
				inboundId: selectedInboundId ?? 0,
			},
			{
				enabled: !!selectedInboundId,
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
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
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
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
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
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
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
			},
		),
	);

	const previousInboundId = useRef(selectedInboundId);
	useEffect(() => {
		if (previousInboundId.current === selectedInboundId) return;
		previousInboundId.current = selectedInboundId;
		setSelectedDemandIds([]);
		setReceiveInputs({});
		setIssueResolutionInputs({});
	}, [selectedInboundId]);
	const selectedShipment = selectedShipmentQuery.data ?? null;
	const inboundDocuments = inboundDocumentsQuery.data ?? [];
	const inboundExtractions = inboundExtractionsQuery.data ?? [];
	const inboundActivity = inboundActivityQuery.data ?? [];

	useEffect(() => {
		if (!selectedShipment?.items?.length) return;
		setReceiveInputs((current) => {
			const next = { ...current };
			for (const item of selectedShipment.items) {
				const receivedGoodQty = Number(item.qtyGood || 0);
				next[item.id] = next[item.id] || {
					qtyReceived: String(
						receivedGoodQty + Number(item.qtyIssue || 0) || item.qty || 0,
					),
					qtyGood: String(
						receivedGoodQty + Number(item.qtyIssue || 0) > 0
							? item.qtyGood
							: (item.qty ?? ""),
					),
					qtyIssue: String(item.qtyIssue ?? 0),
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
				queryKey: trpc.inventories.inboundShipments.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inboundDemandQueue.queryKey({}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.supplierReorderSuggestions.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inboundStatusDemandReconciliation.queryKey({
					take: 50,
				}),
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
				void setParams({ inboundId: data.id, inboundQueue: null });
				toast.success(`Inbound #${data.id} created`);
				refreshInboundData(data.id);
			},
		}),
	);

	const createFromDemandsMutation = useMutation(
		trpc.inventories.createInboundShipmentFromDemands.mutationOptions({
			onSuccess(data) {
				void setParams({ inboundId: data.inboundId, inboundQueue: null });
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
			onError(error) {
				toast.error(error.message);
			},
			onSuccess(data) {
				toast.success(
					`Inbound received: ${data.newlyReceivedQty} new stock; ${data.allocation.allocatedQty} reserved for order needs`,
				);
				setReceiveInputs({});
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
					shipment.status !== "completed" &&
					shipment.status !== "closed" &&
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

	return {
		trpc,
		queryClient,
		setSelectedInboundId,
		suppliersQuery,
		shipmentsQuery,
		demandQueueQuery,
		reorderSuggestionsQuery,
		inboundReconciliationQuery,
		shipments,
		suppliers,
		demandQueue,
		inboundReconciliation,
		reorderSuggestions,
		reorderSummary,
		selectedShipmentQuery,
		inboundDocumentsQuery,
		inboundExtractionsQuery,
		inboundActivityQuery,
		selectedShipment,
		inboundDocuments,
		inboundExtractions,
		inboundActivity,
		refreshInboundData,
		createInboundMutation,
		createFromDemandsMutation,
		assignDemandsMutation,
		extractMutation,
		uploadDocumentsMutation,
		applyExtractionMutation,
		receiveInboundMutation,
		resolveIssueMutation,
		selectedDemandRows,
		shipmentSummary,
		selectedInboundId,
		inboundQueue,
		setParams,
		selectedSupplierId,
		setSelectedSupplierId,
		selectedDemandIds,
		setSelectedDemandIds,
		receiveInputs,
		setReceiveInputs,
		issueResolutionInputs,
		setIssueResolutionInputs,
	};
}
const Context = createContext<ReturnType<typeof useInboundController> | null>(
	null,
);
export function InboundReceivingProvider({
	children,
}: { children: ReactNode }) {
	const value = useInboundController();
	return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useInboundReceiving() {
	const value = useContext(Context);
	if (!value) throw new Error("InboundReceivingProvider is required.");
	return value;
}
