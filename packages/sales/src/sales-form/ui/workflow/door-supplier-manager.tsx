"use client";

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
	onDeleteSupplier: (supplier: DoorSupplierManagerSupplier) => void | Promise<void>;
};

export function DoorSupplierManager(props: DoorSupplierManagerProps) {
	return (
		<div className="space-y-3 rounded-lg border p-3">
			<div className="flex items-center gap-2">
				<Input
					placeholder={
						props.editingSupplier ? "Update supplier name" : "New supplier name"
					}
					value={props.supplierNameInput}
					onChange={(event) =>
						props.onSupplierNameInputChange(event.target.value)
					}
				/>
				<Button size="sm" disabled={props.isSaving} onClick={props.onSaveSupplier}>
					{props.editingSupplier ? "Update" : "Add"}
				</Button>
				{props.editingSupplier ? (
					<Button size="sm" variant="outline" onClick={props.onCancelEdit}>
						Cancel
					</Button>
				) : null}
			</div>
			<button
				type="button"
				className={`flex w-full items-center rounded-lg border px-3 py-2 text-left text-sm ${
					!props.selectedSupplierUid
						? "border-primary bg-primary/5"
						: "hover:border-primary"
				}`}
				onClick={props.onSelectDefault}
			>
				GND MILLWORK (Default)
			</button>
			{props.suppliers.map((supplier) => {
				const selected = props.selectedSupplierUid === supplier.uid;

				return (
					<div
						key={supplier.id}
						className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
							selected
								? "border-primary bg-primary/5"
								: "hover:border-primary"
						}`}
					>
						<button
							type="button"
							className="flex-1 text-left text-sm uppercase"
							onClick={() => props.onSelectSupplier(supplier)}
						>
							{supplier.name}
						</button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => props.onEditSupplier(supplier)}
						>
							Edit
						</Button>
						<Button
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
