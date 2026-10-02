"use client";

import { StockPolicyDialog } from "@/components/inventory/stock-policy-dialog";
import { VariantStockThresholdDialog } from "@/components/inventory/variant-stock-threshold-dialog";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Textarea } from "@gnd/ui/textarea";

import {
	type AdjustmentReason,
	optionalNumber,
	reasons,
	useInventoryStockForm,
} from "./inventory-stock/form-context";
export function InventoryStockAdjustmentForm() {
	const {
		auth,
		canManage,
		search,
		setSearch,
		variant,
		setVariant,
		selectionLocked,
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
		openingCount,
		setOpeningCount,
		identityConfirmed,
		setIdentityConfirmed,
	} = useInventoryStockForm();
	if (!auth.isPending && !canManage) {
		return (
			<p className="text-sm text-muted-foreground">
				Warehouse stock changes require the Edit Inbound Order permission.
			</p>
		);
	}
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (!valid || adjustment.isPending || !variant || quantity == null)
					return;
				adjustment.mutate({
					inventoryVariantId: Number(variant.id),
					inventoryStockId: stock?.id ?? null,
					supplierId: stock
						? stock.supplierId
						: supplierId === "none"
							? null
							: Number(supplierId),
					location: stock ? stock.location : location.trim() || null,
					unitPrice: optionalNumber(unitPrice),
					qty: quantity,
					expectedQty: previousQty,
					mode,
					reason,
					reference: reference.trim() || null,
					notes: notes.trim() || null,
					openingCount,
				});
			}}
			className="space-y-4"
		>
			{target.isError ? (
				<p role="alert">
					Unable to load this inventory. Close the sheet and retry.
				</p>
			) : null}
			{target.data?.length === 0 ? (
				<p role="alert">This inventory or variant is no longer available.</p>
			) : null}
			<fieldset
				disabled={adjustment.isPending || !canManage}
				className="grid min-w-0 gap-4 sm:grid-cols-2"
			>
				{context.data ? (
					<div className="space-y-2 sm:col-span-2">
						<p className="text-sm text-muted-foreground">
							{context.data.stockUnit
								? `Stock counted in ${context.data.stockUnit}s`
								: "Stock unit needs confirmation"}
						</p>
						{context.data.identityWarnings.map((warning) => (
							<p key={warning} role="alert" className="text-sm text-amber-700">
								{warning}
							</p>
						))}
						<div className="flex flex-wrap gap-2">
							{!context.data.stockUnit &&
							context.data.inventory.inventoryCategory ? (
								<StockPolicyDialog
									selector={{
										categoryId: context.data.inventory.inventoryCategory.id,
									}}
									trigger={
										<Button type="button" variant="outline" size="sm">
											Confirm stock units
										</Button>
									}
								/>
							) : null}
							{previousQty === 0 || openingCount ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={!openingCount && previousQty !== 0}
									onClick={() => {
										setOpeningCount(!openingCount);
										setIdentityConfirmed(false);
										setMode(openingCount ? "delta" : "set");
										setReason(openingCount ? "stock_in" : "cycle_count");
										setQty("");
									}}
								>
									{openingCount
										? "Use stock adjustment"
										: "Record opening count"}
								</Button>
							) : null}
						</div>
						{openingCount ? (
							<label
								htmlFor="opening-count-identity"
								className="flex items-start gap-2 text-sm"
							>
								<Checkbox
									id="opening-count-identity"
									checked={identityConfirmed}
									onCheckedChange={(checked) =>
										setIdentityConfirmed(checked === true)
									}
								/>
								I have verified this exact variant, count unit, location and
								supplier against the physical count.
							</label>
						) : null}
						{openingCount ? (
							<p className="text-xs text-muted-foreground">
								Enter the physical total and a count reference. Opening counts
								use the existing stock audit and preserve an exact zero
								baseline.
							</p>
						) : null}
					</div>
				) : null}
				<div className="min-w-0 space-y-2 sm:col-span-2">
					<Label id="stock-product-label">Product or component</Label>
					<ComboboxDropdown
						Trigger={
							<Button
								type="button"
								variant="outline"
								id="stock-product"
								aria-labelledby="stock-product-label"
								className="w-full justify-between"
								disabled={selectionLocked || !canManage || adjustment.isPending}
							>
								<span className="truncate">
									{variant?.label || "Select a product or component"}
								</span>
							</Button>
						}
						items={variants.data ?? []}
						selectedItem={variant}
						onSearch={setSearch}
						isLoading={variants.isFetching}
						disabled={selectionLocked || !canManage || adjustment.isPending}
						searchPlaceholder="Search products, components or SKU..."
						placeholder="Select a product or component"
						triggerClassName="w-full justify-between"
						onSelect={(item) => {
							setVariant(item);
							setStockId("new");
							setSupplierId("none");
							setLocation("");
							setUnitPrice("");
							setQty("");
							setOpeningCount(false);
							setIdentityConfirmed(false);
						}}
						emptyResults={
							variants.isError
								? "Unable to load products. Close and retry."
								: "No matching variants. Try another name or SKU."
						}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="stock-row">Stock location</Label>
					<Select
						value={stockId}
						disabled={!context.data || adjustment.isPending}
						onValueChange={(id) => {
							if (!id) return;
							setStockId(id);
							setOpeningCount(false);
							setIdentityConfirmed(false);
							setQty("");
							setUnitPrice("");
						}}
					>
						<SelectTrigger id="stock-row">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="new">Add stock at a new location</SelectItem>
							{context.data?.stocks.map((row) => (
								<SelectItem key={row.id} value={String(row.id)}>
									{row.location || "Warehouse"} ·{" "}
									{row.supplier?.name || "No supplier"} · {row.qty}{" "}
									{context.data?.stockUnit ?? "unit"}s
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				{context.data && !selectionLocked ? (
					<VariantStockThresholdDialog
						variantId={context.data.id}
						override={context.data.lowStockAlert}
					/>
				) : null}
				{stockId === "new" ? (
					<>
						<div className="space-y-2">
							<Label htmlFor="stock-location">Location</Label>
							<Input
								id="stock-location"
								value={location}
								onChange={(event) => setLocation(event.target.value)}
								placeholder="Warehouse, aisle or bin (optional)"
								maxLength={120}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="stock-supplier">Supplier</Label>
							<Select value={supplierId} onValueChange={setSupplierId}>
								<SelectTrigger id="stock-supplier">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No supplier</SelectItem>
									{suppliers.data?.map((supplier) => (
										<SelectItem key={supplier.id} value={String(supplier.id)}>
											{supplier.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</>
				) : null}
				<div className="space-y-2">
					<Label htmlFor="stock-mode">Adjustment</Label>
					<Select
						value={mode}
						onValueChange={(value) => {
							setMode(value as "delta" | "set");
							if (value === "set") setReason("cycle_count");
						}}
					>
						<SelectTrigger id="stock-mode">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="delta">Add or remove quantity</SelectItem>
							<SelectItem value="set">Set counted quantity</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="stock-quantity">
						{mode === "set" ? "Counted quantity" : "Quantity change"}
					</Label>
					<Input
						id="stock-quantity"
						aria-describedby="stock-quantity-help"
						type="number"
						step="any"
						min={mode === "set" ? 0 : undefined}
						required
						value={qty}
						onChange={(event) => setQty(event.target.value)}
						placeholder={
							mode === "set"
								? "New total"
								: "Positive to add, negative to remove"
						}
					/>
					{nextQty != null && nextQty < (stock?.allocatedQty ?? 0) ? (
						<p
							id="stock-quantity-help"
							role="alert"
							className="text-xs text-destructive"
						>
							{stock?.allocatedQty} pieces are assigned to sales. The count must
							cover them.
						</p>
					) : null}
				</div>
				<div className="space-y-2">
					<Label htmlFor="stock-reason">Reason</Label>
					<Select
						value={reason}
						onValueChange={(value) => setReason(value as AdjustmentReason)}
					>
						<SelectTrigger id="stock-reason">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{reasons.map((item) => (
								<SelectItem key={item.value} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="stock-unit-price">Unit cost (optional)</Label>
					<Input
						id="stock-unit-price"
						type="number"
						min={0}
						step="any"
						value={unitPrice}
						onChange={(event) => setUnitPrice(event.target.value)}
						placeholder={
							stock?.price == null ? "Optional" : String(stock.price)
						}
					/>
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="stock-reference">
						{openingCount
							? "Count reference (required)"
							: "Reference (optional)"}
					</Label>
					<Input
						id="stock-reference"
						value={reference}
						onChange={(event) => setReference(event.target.value)}
						maxLength={200}
						placeholder="Receipt or cycle count reference"
					/>
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="stock-notes">Notes (optional)</Label>
					<Textarea
						id="stock-notes"
						value={notes}
						onChange={(event) => setNotes(event.target.value)}
						maxLength={2000}
						placeholder="Why is the stock changing?"
					/>
				</div>
			</fieldset>
			{context.isError ? (
				<div role="alert" className="text-sm text-destructive">
					Unable to load this stock.{" "}
					<Button
						type="button"
						variant="link"
						onClick={() => void context.refetch()}
					>
						Retry
					</Button>
				</div>
			) : null}
			<div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
				<p aria-live="polite" className="text-sm text-muted-foreground">
					{context.isFetching
						? "Refreshing current stock..."
						: variant && context.data && (stockId === "new" || stock)
							? `Current: ${previousQty} ${context.data?.stockUnit ?? "unit"}s${nextQty != null && Number.isFinite(nextQty) ? ` → After adjustment: ${nextQty} ${context.data?.stockUnit ?? "unit"}s` : ""}`
							: "Select stock to review the current quantity."}
				</p>
				<Button type="submit" disabled={!valid || adjustment.isPending}>
					{adjustment.isPending ? "Posting..." : "Post adjustment"}
				</Button>
			</div>
		</form>
	);
}
