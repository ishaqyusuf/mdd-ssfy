/** @jsxImportSource react */
"use client";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";

export type DoorSupplierManagerSupplier = {
	id: number;
	uid?: string | null;
	name?: string | null;
};

export type DoorSupplierManagerEditingSupplier = {
	id: number;
	name?: string | null;
} | null;

export type DoorSupplierManagerProps = {
	suppliers: DoorSupplierManagerSupplier[];
	selectedSupplierUid?: string | null;
	supplierNameInput: string;
	editingSupplier: DoorSupplierManagerEditingSupplier;
	isSaving?: boolean;
	isDeleting?: boolean;
	onSupplierNameInputChange: (value: string) => void;
	onSaveSupplier: () => void | Promise<void>;
	onCancelEdit: () => void;
	onSelectDefault: () => void;
	onSelectSupplier: (supplier: DoorSupplierManagerSupplier) => void;
	onEditSupplier: (supplier: DoorSupplierManagerSupplier) => void;
	onDeleteSupplier: (
		supplier: DoorSupplierManagerSupplier,
	) => void | Promise<void>;
};

export function DoorSupplierManager(props: DoorSupplierManagerProps) {
	return (
		<div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<Input
					aria-label={
						props.editingSupplier ? "Update supplier name" : "New supplier name"
					}
					className="min-w-0 flex-1 sm:min-w-56"
					placeholder={
						props.editingSupplier ? "Update supplier name" : "New supplier name"
					}
					value={props.supplierNameInput}
					onChange={(event) =>
						props.onSupplierNameInputChange(event.target.value)
					}
				/>
				<Button
					type="button"
					size="sm"
					disabled={props.isSaving}
					onClick={props.onSaveSupplier}
				>
					{props.editingSupplier ? "Update" : "Add"}
				</Button>
				{props.editingSupplier ? (
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={props.onCancelEdit}
					>
						Cancel
					</Button>
				) : null}
			</div>
			<button
				type="button"
				className={`flex w-full items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors ${
					!props.selectedSupplierUid
						? "border-primary bg-primary/5"
						: "hover:border-primary/70"
				}`}
				aria-pressed={!props.selectedSupplierUid}
				onClick={props.onSelectDefault}
			>
				<span className="font-medium">GND MILLWORK</span>
				<Badge variant="secondary" className="rounded-md">
					Default
				</Badge>
			</button>
			{props.suppliers.map((supplier) => {
				const selected = props.selectedSupplierUid === supplier.uid;

				return (
					<div
						key={supplier.id}
						className={`flex flex-col gap-2 rounded-md border bg-background px-3 py-2 transition-colors sm:flex-row sm:items-center ${
							selected
								? "border-primary bg-primary/5"
								: "hover:border-primary/70"
						}`}
					>
						<button
							type="button"
							className="min-w-0 flex-1 text-left text-sm font-medium uppercase"
							aria-pressed={selected}
							onClick={() => props.onSelectSupplier(supplier)}
						>
							{supplier.name}
						</button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => props.onEditSupplier(supplier)}
						>
							Edit
						</Button>
						<Button
							type="button"
							size="sm"
							variant="destructive"
							disabled={props.isDeleting}
							onClick={() => props.onDeleteSupplier(supplier)}
						>
							Delete
						</Button>
					</div>
				);
			})}
		</div>
	);
}
