"use client";
import { SalesStockNeedsPanel } from "@/components/inventory/sales-stock-needs-panel";
import { SalesStockNeedsTable } from "@/components/inventory/sales-stock-needs-table";
import { useTRPC } from "@/trpc/client";
import { salesFormPortableLineItemSchema } from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useQuery } from "@gnd/ui/tanstack";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { useCustomerProfilesQuery } from "../api";
import { useNewSalesFormStore } from "../store";

export function SalesFormInventoryWorkspace({
	children,
}: { children: ReactNode }) {
	const [tab, setTab] = useQueryState(
		"salesFormTab",
		parseAsStringLiteral(["items", "inventory"] as const).withDefault("items"),
	);
	return (
		<Tabs
			value={tab}
			onValueChange={(value) => setTab(value as "items" | "inventory")}
		>
			<TabsList>
				<TabsTrigger value="items">Items</TabsTrigger>
				<TabsTrigger value="inventory">Inventory</TabsTrigger>
			</TabsList>
			<TabsContent
				value="items"
				forceMount
				className="data-[state=inactive]:hidden"
			>
				{children}
			</TabsContent>
			<TabsContent value="inventory">
				{tab === "inventory" ? <SalesFormInventoryTab /> : null}
			</TabsContent>
		</Tabs>
	);
}
export function SalesFormInventoryTab() {
	const record = useNewSalesFormStore((state) => state.record);
	const dirty = useNewSalesFormStore((state) => state.dirty);
	return record?.salesId && !dirty ? (
		<div className="py-3">
			<SalesStockNeedsPanel
				key={record.salesId}
				salesOrderId={record.salesId}
			/>
		</div>
	) : (
		<DraftStockPreview />
	);
}
function DraftStockPreview() {
	const trpc = useTRPC();
	const record = useNewSalesFormStore((state) => state.record);
	const profileId = record?.form?.customerProfileId;
	const profiles = useCustomerProfilesQuery(Boolean(profileId));
	const selectedProfile = profiles.data?.find(
		(profile) => profile.id === profileId,
	);
	const coefficient = profileId
		? selectedProfile
			? Number(selectedProfile.coefficient ?? 1)
			: null
		: 1;
	const lines = salesFormPortableLineItemSchema
		.array()
		.safeParse(record?.lineItems || []);
	const preview = useQuery(
		trpc.inventories.salesFormStockPreview.queryOptions(
			{
				lineItems: lines.success ? lines.data : [],
				profileCoefficient: coefficient,
			},
			{
				enabled:
					!!record && lines.success && coefficient != null && coefficient > 0,
			},
		),
	);
	return (
		<section className="space-y-4 py-3">
			<div>
				<h2 className="font-medium">Selected inventory needs</h2>
				<p className="text-sm text-muted-foreground">
					Preview only. Save the current changes before applying stock or
					creating inbound.
				</p>
			</div>
			{!lines.success ? (
				<p role="alert">
					A selected item has incomplete inventory details. Review the item
					before checking stock.
				</p>
			) : profileId &&
				(profiles.isError || (coefficient != null && coefficient <= 0)) ? (
				<p role="alert">
					Customer profile quantities could not be resolved. Check the selected
					profile and retry.
				</p>
			) : preview.isPending ? (
				<p>Checking selected stock…</p>
			) : preview.isError ? (
				<div role="alert">
					<p>{preview.error.message}</p>
					<Button variant="outline" onClick={() => preview.refetch()}>
						Retry
					</Button>
				</div>
			) : preview.data.rows.length ? (
				<SalesStockNeedsTable rows={preview.data.rows} />
			) : (
				<p className="py-12 text-center text-muted-foreground">
					No tracked inventory needs selected.
				</p>
			)}
		</section>
	);
}
