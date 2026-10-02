"use client";
import { useInventoryInboundParams } from "@/hooks/use-inventory-inbound-params";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { type ReactNode, createContext, useContext, useState } from "react";

type Option = RouterOutputs["inventories"]["stockVariantOptions"][number];
type Item = {
	key: string;
	variant: Option;
	qty: string;
	unitPrice: string;
	location: string;
};
function useGeneralInboundDraft() {
	const trpc = useTRPC();
	const client = useQueryClient();
	const { setParams } = useInventoryInboundParams();
	const [idempotencyKey] = useState(() => crypto.randomUUID());
	const [search, setSearch] = useState("");
	const [supplierId, setSupplierId] = useState("none");
	const [reference, setReference] = useState("");
	const [items, setItems] = useState<Item[]>([]);
	const variants = useQuery(
		trpc.inventories.stockVariantOptions.queryOptions({ q: search, take: 20 }),
	);
	const suppliers = useQuery(
		trpc.inventories.inboundSuppliers.queryOptions(undefined),
	);
	const mutation = useMutation(
		trpc.inventories.createGeneralInbound.mutationOptions({
			onSuccess: async (result) => {
				await client.invalidateQueries({
					queryKey: trpc.inventories.pathKey(),
				});
				await setParams({
					createWarehouseInbound: null,
					inboundId: result.inboundId,
				});
				toast({ title: "Warehouse inbound created", variant: "success" });
			},
			onError: (error) =>
				toast({
					title: "Unable to create inbound",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const valid =
		items.length > 0 &&
		items.every(
			(item) =>
				item.qty.trim() &&
				Number.isFinite(Number(item.qty)) &&
				Number(item.qty) > 0 &&
				Number(item.qty) <= 1_000_000 &&
				(!item.unitPrice.trim() ||
					(Number.isFinite(Number(item.unitPrice)) &&
						Number(item.unitPrice) >= 0)),
		);
	function add(variant: Option) {
		setItems((rows) => [
			...rows,
			{
				key: crypto.randomUUID(),
				variant,
				qty: "",
				unitPrice: "",
				location: "",
			},
		]);
	}
	function update(key: string, patch: Partial<Item>) {
		setItems((rows) =>
			rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
		);
	}
	function remove(key: string) {
		setItems((rows) => rows.filter((row) => row.key !== key));
	}
	function submit() {
		if (!valid || mutation.isPending) return;
		mutation.mutate({
			idempotencyKey,
			supplierId: supplierId === "none" ? null : Number(supplierId),
			reference: reference.trim() || null,
			items: items.map((item) => ({
				inventoryVariantId: Number(item.variant.id),
				qty: Number(item.qty),
				unitPrice: item.unitPrice.trim() ? Number(item.unitPrice) : null,
				location: item.location.trim() || null,
			})),
		});
	}
	return {
		search,
		setSearch,
		supplierId,
		setSupplierId,
		reference,
		setReference,
		items,
		variants,
		suppliers,
		valid,
		mutation,
		add,
		update,
		remove,
		submit,
	};
}
const Context = createContext<ReturnType<typeof useGeneralInboundDraft> | null>(
	null,
);
export function GeneralInboundFormProvider({
	children,
}: { children: ReactNode }) {
	const draft = useGeneralInboundDraft();
	return <Context.Provider value={draft}>{children}</Context.Provider>;
}
export function useGeneralInboundForm() {
	const value = useContext(Context);
	if (!value) throw new Error("GeneralInboundFormProvider is required.");
	return value;
}
