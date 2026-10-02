"use client";
import { Button } from "@gnd/ui/button";
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
import { useGeneralInboundForm } from "./form-context";
export function GeneralInboundForm() {
	const form = useGeneralInboundForm();
	return (
		<form
			className="flex flex-1 flex-col gap-5"
			onSubmit={(event) => {
				event.preventDefault();
				form.submit();
			}}
		>
			<fieldset disabled={form.mutation.isPending} className="space-y-5">
				<div className="space-y-2">
					<Label htmlFor="warehouse-inbound-supplier">Supplier</Label>
					<Select value={form.supplierId} onValueChange={form.setSupplierId}>
						<SelectTrigger id="warehouse-inbound-supplier">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">No supplier</SelectItem>
							{form.suppliers.data?.map((supplier) => (
								<SelectItem key={supplier.id} value={String(supplier.id)}>
									{supplier.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="warehouse-inbound-reference">Reference</Label>
					<Input
						id="warehouse-inbound-reference"
						maxLength={200}
						value={form.reference}
						onChange={(event) => form.setReference(event.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label>Add product or component</Label>
					<ComboboxDropdown
						items={form.variants.data || []}
						onSearch={form.setSearch}
						onSelect={form.add}
						isLoading={form.variants.isFetching}
						placeholder="Add a product or component"
						searchPlaceholder="Search name or SKU…"
						disabled={form.items.length >= 100}
						emptyResults={
							form.variants.isError
								? "Unable to load products. Close and retry."
								: "No matching variants."
						}
					/>
				</div>
				{form.items.map((item, index) => (
					<div key={item.key} className="space-y-3 border-b pb-5">
						<div className="flex items-start justify-between gap-3">
							<p className="text-sm font-medium">{item.variant.label}</p>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => form.remove(item.key)}
								aria-label={`Remove ${item.variant.label}`}
							>
								Remove
							</Button>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label htmlFor={`inbound-qty-${index}`}>Quantity</Label>
								<Input
									id={`inbound-qty-${index}`}
									type="number"
									min={0}
									step="any"
									value={item.qty}
									onChange={(event) =>
										form.update(item.key, { qty: event.target.value })
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor={`inbound-cost-${index}`}>Unit cost</Label>
								<Input
									id={`inbound-cost-${index}`}
									type="number"
									min={0}
									step="any"
									value={item.unitPrice}
									onChange={(event) =>
										form.update(item.key, { unitPrice: event.target.value })
									}
								/>
							</div>
							<div className="col-span-2 space-y-2">
								<Label htmlFor={`inbound-location-${index}`}>
									Warehouse location
								</Label>
								<Input
									id={`inbound-location-${index}`}
									maxLength={120}
									value={item.location}
									onChange={(event) =>
										form.update(item.key, { location: event.target.value })
									}
									placeholder="Warehouse, aisle or bin"
								/>
							</div>
						</div>
					</div>
				))}
			</fieldset>
			<div className="sticky bottom-0 mt-auto border-t bg-background py-4">
				<Button
					type="submit"
					className="w-full"
					disabled={!form.valid || form.mutation.isPending}
				>
					{form.mutation.isPending ? "Creating…" : "Create warehouse inbound"}
				</Button>
			</div>
		</form>
	);
}
