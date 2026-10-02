"use client";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { type ReactNode, createContext, useContext, useState } from "react";
type VariantOption =
	RouterOutputs["inventories"]["stockVariantOptions"][number];
export type AdjustmentReason =
	| "stock_in"
	| "stock_out"
	| "correction"
	| "cycle_count"
	| "damage"
	| "return"
	| "consume"
	| "release";
export const reasons: Array<{ value: AdjustmentReason; label: string }> = [
	{ value: "stock_in", label: "Add stock" },
	{ value: "correction", label: "Correction" },
	{ value: "cycle_count", label: "Cycle count" },
	{ value: "damage", label: "Damage" },
	{ value: "return", label: "Return" },
	{ value: "stock_out", label: "Remove stock" },
	{ value: "consume", label: "Consume" },
	{ value: "release", label: "Release" },
];

export function optionalNumber(value: string) {
	return value.trim() ? Number(value) : null;
}

type StockAdjustmentTarget = {
	inventoryId?: number;
	initialVariantId?: number;
	initialStockId?: number;
};
function useStockAdjustmentState({
	inventoryId,
	initialVariantId,
	initialStockId,
}: StockAdjustmentTarget) {
	const trpc = useTRPC();
	const auth = useAuth();
	const queryClient = useQueryClient();
	const canManage = Boolean(auth.can.editInboundOrder);
	const [search, setSearch] = useState("");
	const [selectedVariant, setVariant] = useState<VariantOption>();
	const [selectedStockId, setStockId] = useState<string | undefined>(
		initialStockId ? String(initialStockId) : undefined,
	);
	const [supplierId, setSupplierId] = useState("none");
	const [location, setLocation] = useState("");
	const [unitPrice, setUnitPrice] = useState("");
	const [qty, setQty] = useState("");
	const [mode, setMode] = useState<"delta" | "set">("delta");
	const [reason, setReason] = useState<AdjustmentReason>("stock_in");
	const [reference, setReference] = useState("");
	const [notes, setNotes] = useState("");
	const [openingCount, setOpeningCount] = useState(false);
	const [identityConfirmed, setIdentityConfirmed] = useState(false);
	const target = useQuery(
		trpc.inventories.stockVariantOptions.queryOptions(
			{ inventoryId, inventoryVariantId: initialVariantId, take: 2 },
			{ enabled: canManage && Boolean(inventoryId || initialVariantId) },
		),
	);
	const selectionLocked = Boolean(initialVariantId);
	const resolvedTarget = target.data?.length === 1 ? target.data[0] : undefined;
	const variant = selectionLocked
		? resolvedTarget
		: (selectedVariant ?? resolvedTarget);
	const variants = useQuery(
		trpc.inventories.stockVariantOptions.queryOptions(
			{ q: search, take: 20, inventoryId },
			{ enabled: canManage && !selectionLocked },
		),
	);
	const context = useQuery(
		trpc.inventories.stockVariantContext.queryOptions(
			{ inventoryVariantId: Number(variant?.id) || 1 },
			{ enabled: canManage && Boolean(variant) },
		),
	);
	const suppliers = useQuery(
		trpc.inventories.inboundSuppliers.queryOptions(undefined, {
			enabled: canManage,
		}),
	);
	const stockId =
		selectedStockId ??
		((inventoryId || initialVariantId) && context.data?.stocks.length === 1
			? String(context.data.stocks[0]?.id)
			: "new");
	const stock = context.data?.stocks.find((row) => String(row.id) === stockId);
	const previousQty = stock?.qty ?? 0;
	const quantity = optionalNumber(qty);
	const nextQty =
		quantity == null
			? null
			: mode === "set"
				? quantity
				: previousQty + quantity;
	const valid = Boolean(
		variant &&
			context.data &&
			!context.isFetching &&
			!context.isError &&
			(stockId === "new" || stock) &&
			quantity != null &&
			Number.isFinite(nextQty) &&
			nextQty != null &&
			nextQty >= (stock?.allocatedQty ?? 0) &&
			nextQty !== previousQty &&
			(!openingCount ||
				(previousQty === 0 &&
					mode === "set" &&
					reason === "cycle_count" &&
					reference.trim() &&
					context.data?.stockUnit &&
					identityConfirmed)) &&
			(optionalNumber(unitPrice) == null ||
				(Number.isFinite(Number(unitPrice)) && Number(unitPrice) >= 0)),
	);
	const adjustment = useMutation(
		trpc.inventories.adjustInventoryStock.mutationOptions({
			async onSuccess(data) {
				setQty("");
				setOpeningCount(false);
				setIdentityConfirmed(false);
				toast({
					title: "Stock adjusted",
					description: `${data.previousQty} → ${data.currentQty}.`,
					variant: "success",
				});
				await queryClient.invalidateQueries({
					queryKey: trpc.inventories.pathKey(),
				});
				setStockId(String(data.inventoryStockId));
			},
			onError(error) {
				toast({
					title: "Unable to adjust stock",
					description: error.message,
					variant: "destructive",
				});
				void context.refetch();
			},
		}),
	);
	return {
		auth,
		canManage,
		search,
		setSearch,
		variant,
		selectionLocked,
		setVariant: (value: VariantOption) => {
			if (!selectionLocked) setVariant(value);
		},
		stockId,
		setStockId,
		supplierId,
		setSupplierId,
		location,
		setLocation,
		unitPrice,
		setUnitPrice,
		qty,
		setQty,
		mode,
		setMode,
		reason,
		setReason,
		reference,
		setReference,
		notes,
		setNotes,
		openingCount,
		setOpeningCount,
		identityConfirmed,
		setIdentityConfirmed,
		variants,
		target,
		context,
		suppliers,
		stock,
		previousQty,
		quantity,
		nextQty,
		valid,
		adjustment,
	};
}
const Context = createContext<ReturnType<
	typeof useStockAdjustmentState
> | null>(null);
export function InventoryStockFormProvider({
	children,
	...target
}: { children: ReactNode } & StockAdjustmentTarget) {
	const value = useStockAdjustmentState(target);
	return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useInventoryStockForm() {
	const value = useContext(Context);
	if (!value) throw new Error("InventoryStockFormProvider is required.");
	return value;
}
