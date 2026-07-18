"use client";

import { InventorySuppliersColumnVisibility } from "@/components/tables-2/inventory-suppliers/column-visibility";
import type { InventorySupplierRow } from "@/components/tables-2/inventory-suppliers/columns";
import { DataTable } from "@/components/tables-2/inventory-suppliers/data-table";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useEffect, useMemo, useState } from "react";

type Props = {
	suppliers: InventorySupplierRow[];
	onSuppliersChange: (next: InventorySupplierRow[]) => void;
	defaultSupplierId?: number | null;
	onDefaultSupplierChange?: (supplierId: number | null) => void;
	initialSettings?: Partial<TableSettings>;
	isLoading?: boolean;
	tableHeight?: string;
	showSyncButton?: boolean;
	title?: string;
	description?: string;
};

type EditorState = {
	open: boolean;
	supplier: InventorySupplierRow | null;
};

const emptySupplier: InventorySupplierRow = {
	id: null,
	uid: null,
	name: "",
	email: "",
	phone: "",
	address: "",
};

export function InventorySuppliersManager(props: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [editor, setEditor] = useState<EditorState>({
		open: false,
		supplier: null,
	});

	const supplierReviewQuery = useQuery(
		trpc.inventories.inventorySupplierDykeReview.queryOptions(),
	);
	const searchQuery = useQuery(
		trpc.inventories.inventorySuppliers.queryOptions(
			{
				q: search.trim() || null,
			},
			{
				enabled: search.trim().length > 0,
			},
		),
	);
	const refreshSuppliers = () => {
		queryClient.invalidateQueries({
			queryKey: trpc.inventories.inventorySuppliers.pathKey(),
		});
		queryClient.invalidateQueries({
			queryKey: trpc.inventories.inventorySupplierDykeReview.pathKey(),
		});
	};

	const saveSupplierMutation = useMutation(
		trpc.inventories.saveInventorySupplier.mutationOptions({
			onSuccess(saved) {
				const current = props.suppliers || [];
				const existingIndex = current.findIndex(
					(supplier) => supplier.id === saved.id,
				);
				const next =
					existingIndex >= 0
						? current.map((supplier, index) =>
								index === existingIndex
									? {
											id: saved.id,
											uid: saved.uid,
											name: saved.name,
											email: saved.email,
											phone: saved.phone,
											address: saved.address,
										}
									: supplier,
							)
						: [
								{
									id: saved.id,
									uid: saved.uid,
									name: saved.name,
									email: saved.email,
									phone: saved.phone,
									address: saved.address,
								},
								...current,
							];
				props.onSuppliersChange(next);
				setEditor({
					open: false,
					supplier: null,
				});
				setSearch("");
				supplierReviewQuery.refetch();
				refreshSuppliers();
				toast({
					title: "Supplier saved",
					variant: "success",
				});
			},
		}),
	);

	const deleteSupplierMutation = useMutation(
		trpc.inventories.deleteInventorySupplier.mutationOptions({
			onSuccess(_, variables) {
				if (!variables) return;
				const supplierId = variables.id;
				const next = (props.suppliers || []).filter(
					(supplier) => supplier.id !== supplierId,
				);
				props.onSuppliersChange(next);
				if (props.defaultSupplierId === supplierId) {
					props.onDefaultSupplierChange?.(null);
				}
				supplierReviewQuery.refetch();
				refreshSuppliers();
				toast({
					title: "Supplier deleted",
					variant: "success",
				});
			},
		}),
	);

	const syncSuppliersMutation = useMutation(
		trpc.inventories.syncInventorySuppliersFromDyke.mutationOptions({
			onSuccess(data) {
				const merged = [...(props.suppliers || [])];
				for (const supplier of data) {
					if (merged.find((item) => item.id === supplier.id)) continue;
					merged.push({
						id: supplier.id,
						uid: supplier.uid,
						name: supplier.name,
						email: null,
						phone: null,
						address: null,
					});
				}
				props.onSuppliersChange(merged);
				supplierReviewQuery.refetch();
				refreshSuppliers();
				toast({
					title: "Suppliers synced from Dyke",
					variant: "success",
				});
			},
		}),
	);

	const normalizedSearch = search.trim().toLowerCase();
	const exactMatch = useMemo(
		() =>
			(searchQuery.data || []).find(
				(supplier) => supplier.name.trim().toLowerCase() === normalizedSearch,
			) || null,
		[normalizedSearch, searchQuery.data],
	);
	const alreadySelected = (supplierId?: number | null) =>
		!!props.suppliers.find((supplier) => supplier.id === supplierId);

	const visibleMatches = (searchQuery.data || []).filter(
		(supplier) => !alreadySelected(supplier.id),
	);

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="flex-1">
					{props.title ? (
						<div className="space-y-1">
							<div className="text-sm font-medium">{props.title}</div>
							{props.description ? (
								<div className="text-sm text-muted-foreground">
									{props.description}
								</div>
							) : null}
						</div>
					) : null}
				</div>
				{props.showSyncButton !== false ? (
					<Button
						type="button"
						variant="outline"
						onClick={() => syncSuppliersMutation.mutate()}
						disabled={syncSuppliersMutation.isPending}
					>
						<Icons.RefreshCw className="mr-2 size-4" />
						Sync Door Suppliers
					</Button>
				) : null}
			</div>

			<div className="space-y-3">
				<div className="flex flex-col gap-3 sm:flex-row">
					<div className="relative flex-1">
						<Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							className="pl-9"
							placeholder="Search supplier or add a new one"
						/>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<InventorySuppliersColumnVisibility />
						<Button
							type="button"
							onClick={() =>
								setEditor({
									open: true,
									supplier: {
										...emptySupplier,
										name: search.trim(),
									},
								})
							}
						>
							<Icons.Plus className="mr-2 size-4" />
							Add Supplier
						</Button>
					</div>
				</div>

				{normalizedSearch ? (
					<div className="rounded-md border bg-background">
						<div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Search Results
						</div>
						<div className="divide-y">
							{visibleMatches.map((supplier) => (
								<button
									key={supplier.id}
									type="button"
									className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40"
									onClick={() => {
										props.onSuppliersChange([
											...props.suppliers,
											{
												id: supplier.id,
												uid: supplier.uid,
												name: supplier.name,
												email: supplier.email,
												phone: supplier.phone,
												address: supplier.address,
											},
										]);
										setSearch("");
									}}
								>
									<div className="font-medium">{supplier.name}</div>
									<Badge variant="outline">Add</Badge>
								</button>
							))}
							{!exactMatch && normalizedSearch ? (
								<button
									type="button"
									className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40"
									onClick={() =>
										setEditor({
											open: true,
											supplier: {
												...emptySupplier,
												name: search.trim(),
											},
										})
									}
								>
									<div className="space-y-1">
										<div className="font-medium">
											Create new "{search.trim()}"
										</div>
										<div className="text-xs text-muted-foreground">
											Add this supplier to the shared directory
										</div>
									</div>
									<Badge>New</Badge>
								</button>
							) : null}
						</div>
					</div>
				) : null}

				<DataTable
					data={props.suppliers}
					initialSettings={props.initialSettings}
					isLoading={props.isLoading}
					defaultSupplierId={props.defaultSupplierId}
					isDeleting={deleteSupplierMutation.isPending}
					height={props.tableHeight}
					onSetDefault={
						props.onDefaultSupplierChange
							? (supplier) =>
									props.onDefaultSupplierChange?.(supplier.id || null)
							: undefined
					}
					onEdit={(supplier) =>
						setEditor({
							open: true,
							supplier,
						})
					}
					onDelete={(supplier) => {
						if (!supplier.id) return;
						deleteSupplierMutation.mutate({
							id: supplier.id,
						});
					}}
				/>
			</div>

			{supplierReviewQuery.data?.length ? (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm">Dyke Supplier Matching</CardTitle>
						<CardDescription>
							Review imported door supplier UIDs against the inventory supplier
							directory.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{supplierReviewQuery.data.map((row) => (
							<div
								key={row.dykeSupplierId}
								className="flex items-center justify-between rounded-xl border px-3 py-3"
							>
								<div className="space-y-1">
									<div className="font-medium">{row.dykeName || "-"}</div>
									<div className="text-xs text-muted-foreground">
										{row.dykeUid || "No Dyke UID"}
									</div>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">
										{row.supplierName || "No supplier match"}
									</span>
									<Badge variant={row.matched ? "default" : "outline"}>
										{row.matched ? "Matched" : "Needs match"}
									</Badge>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			) : null}

			<SupplierEditorDialog
				open={editor.open}
				supplier={editor.supplier}
				onOpenChange={(open) =>
					setEditor((prev) => ({
						...prev,
						open,
						supplier: open ? prev.supplier : null,
					}))
				}
				onSubmit={(supplier) => saveSupplierMutation.mutate(supplier)}
				isPending={saveSupplierMutation.isPending}
			/>
		</div>
	);
}

function SupplierEditorDialog(props: {
	open: boolean;
	supplier: InventorySupplierRow | null;
	onOpenChange: (open: boolean) => void;
	onSubmit: (supplier: InventorySupplierRow) => void;
	isPending?: boolean;
}) {
	const [draft, setDraft] = useState<InventorySupplierRow>(emptySupplier);

	useEffect(() => {
		setDraft(props.supplier || emptySupplier);
	}, [props.supplier]);

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{draft.id ? "Edit Supplier" : "Create Supplier"}
					</DialogTitle>
					<DialogDescription>
						Maintain the shared supplier directory used across inventory pricing
						and inbound purchasing.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-2">
					<div className="grid gap-2">
						<label className="text-sm font-medium" htmlFor="supplier-name">
							Name
						</label>
						<Input
							id="supplier-name"
							value={draft.name || ""}
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									name: event.target.value,
								}))
							}
						/>
					</div>
					<div className="grid gap-2">
						<label className="text-sm font-medium" htmlFor="supplier-uid">
							Legacy UID
						</label>
						<Input
							id="supplier-uid"
							value={draft.uid || ""}
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									uid: event.target.value,
								}))
							}
						/>
					</div>
					<div className="grid gap-2 sm:grid-cols-2">
						<div className="grid gap-2">
							<label className="text-sm font-medium" htmlFor="supplier-email">
								Email
							</label>
							<Input
								id="supplier-email"
								value={draft.email || ""}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										email: event.target.value,
									}))
								}
							/>
						</div>
						<div className="grid gap-2">
							<label className="text-sm font-medium" htmlFor="supplier-phone">
								Phone
							</label>
							<Input
								id="supplier-phone"
								value={draft.phone || ""}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										phone: event.target.value,
									}))
								}
							/>
						</div>
					</div>
					<div className="grid gap-2">
						<label className="text-sm font-medium" htmlFor="supplier-address">
							Address
						</label>
						<Input
							id="supplier-address"
							value={draft.address || ""}
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									address: event.target.value,
								}))
							}
						/>
					</div>
				</div>
				<DialogFooter className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => props.onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						disabled={!draft.name?.trim() || props.isPending}
						onClick={() =>
							props.onSubmit({
								...draft,
								name: draft.name.trim(),
								uid: draft.uid?.trim() || null,
								email: draft.email?.trim() || null,
								phone: draft.phone?.trim() || null,
								address: draft.address?.trim() || null,
							})
						}
					>
						Save Supplier
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
