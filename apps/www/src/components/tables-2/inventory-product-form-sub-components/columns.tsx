"use client";

import { ComboxBox } from "@/components/(clean-code)/custom/controlled/combo-box";
import { FormCombobox } from "@/components/common/controls/form-combobox";
import ConfirmBtn from "@/components/confirm-button";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useTRPC } from "@/trpc/client";
import type { InventoryForm } from "@gnd/inventory/schema";
import { Button } from "@gnd/ui/button";
import { Progress } from "@gnd/ui/custom/progress";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { labelValueOptions } from "@gnd/utils";
import type { INVENTORY_STATUS } from "@sales/constants";
import type { ColumnDef } from "@tanstack/react-table";
import type { Control } from "react-hook-form";
import { useWatch } from "react-hook-form";

export type InventoryProductFormSubComponentStatus =
	(typeof INVENTORY_STATUS)[number];

export type InventoryProductFormSubComponentRow = {
	fieldId: string;
	index: number;
	id?: number | null;
	parentId?: number | null;
	defaultInventoryId?: number | null;
	inventoryCategoryId?: number | null;
	status?: InventoryProductFormSubComponentStatus | null;
};

export type InventoryProductFormSubComponentsTableMeta = {
	control: Control<InventoryForm>;
	categoryOptions: unknown[];
	parentInventoryId?: number | null;
	onCategorySelect: (
		row: InventoryProductFormSubComponentRow,
		selected: { data?: { id?: number | string | null } },
		callback: () => void,
	) => void;
	onToggleStatus: (row: InventoryProductFormSubComponentRow) => void;
	onRemove: (row: InventoryProductFormSubComponentRow) => void;
};

type Column = ColumnDef<InventoryProductFormSubComponentRow>;

function getMeta(
	table: unknown,
): InventoryProductFormSubComponentsTableMeta | undefined {
	return (
		table as {
			options?: { meta?: InventoryProductFormSubComponentsTableMeta };
		}
	).options?.meta;
}

function subComponentFieldName<TField extends keyof InventoryForm["subComponents"][number]>(
	index: number,
	field: TField,
): `subComponents.${number}.${TField}` {
	return `subComponents.${index}.${field}`;
}

export function getInventoryProductFormSubComponentRowId(
	row: InventoryProductFormSubComponentRow,
) {
	return row.fieldId || `inventory-product-form-sub-component-${row.index}`;
}

const handleColumn: Column = {
	id: "handle",
	header: "",
	...sizes.custom(48, 48, 48),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		preventDefault: true,
		headerLabel: "Move",
		skeleton: { type: "button", width: "w-6" },
		className: sizeClass(
			sizes.custom(48, 48, 48),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-30",
		),
		contentClassName: "flex justify-center",
	},
	cell: () => (
		<Button
			type="button"
			variant="ghost"
			size="icon-xs"
			className="text-muted-foreground hover:bg-transparent"
			aria-label="Move sub-component category"
		>
			<Icons.GripVerticalIcon className="size-3" />
		</Button>
	),
};

const categoryColumn: Column = {
	id: "category",
	header: "Category",
	...sizes.custom(220, 360, 260),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Category",
		className: sizeClass(
			sizes.custom(220, 360, 260),
			"md:sticky md:left-[48px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<FormCombobox
				control={meta?.control}
				name={subComponentFieldName(row.original.index, "inventoryCategoryId")}
				transformSelectionValue={(data) => Number(data.id)}
				handleSelect={(_value, selected, callback) =>
					meta?.onCategorySelect(row.original, selected, callback)
				}
				comboProps={{
					items: meta?.categoryOptions || [],
					placeholder: "Select category",
				}}
			/>
		);
	},
};

function DefaultProductCell({
	row,
	meta,
}: {
	row: InventoryProductFormSubComponentRow;
	meta?: InventoryProductFormSubComponentsTableMeta;
}) {
	const trpc = useTRPC();
	const categoryId = useWatch({
		control: meta?.control,
		name: subComponentFieldName(row.index, "inventoryCategoryId"),
	});
	const { data } = useQuery(
		trpc.inventories.inventoryProducts.queryOptions(
			{
				categoryId,
			},
			{
				enabled: !!categoryId,
			},
		),
	);
	const { mutateAsync } = useMutation(
		trpc.inventories.updateSubComponent.mutationOptions({}),
	);

	function handleSelect(value: unknown, _selected: unknown, callback: () => void) {
		const inventoryCategoryId = Number(categoryId);
		if (!meta?.parentInventoryId || !Number.isFinite(inventoryCategoryId)) {
			callback();
			return;
		}
		const defaultInventoryId = Number(value);

		mutateAsync({
			parentId: meta.parentInventoryId,
			id: row.id ?? undefined,
			inventoryCategoryId,
			defaultInventoryId: Number.isFinite(defaultInventoryId)
				? defaultInventoryId
				: row.defaultInventoryId ?? undefined,
			index: row.index,
			status: row.status || "published",
		}).then(() => {
			callback();
		});
	}

	return (
		<ComboxBox
			className="h-8 w-full"
			maxSelection={1}
			options={labelValueOptions(data?.data, "title", "id")}
			control={meta?.control}
			name={subComponentFieldName(row.index, "defaultInventoryId")}
			handleSelect={handleSelect}
		/>
	);
}

const defaultProductColumn: Column = {
	id: "defaultProduct",
	header: "Default Product",
	...sizes.custom(220, 420, 280),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Default Product",
		className: sizeClass(sizes.custom(220, 420, 280)),
	},
	cell: ({ row, table }) => (
		<DefaultProductCell row={row.original} meta={getMeta(table)} />
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	...sizes.custom(118, 170, 132),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(118, 170, 132)),
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<Button
				type="button"
				disabled={!row.original.id}
				onClick={() => meta?.onToggleStatus(row.original)}
				variant="ghost"
				size="sm"
			>
				<Progress>
					<Progress.Status>{row.original.status || "draft"}</Progress.Status>
				</Progress>
			</Button>
		);
	},
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	...sizes.custom(64, 80, 72),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-8" },
		className: sizeClass(
			sizes.custom(64, 80, 72),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
		contentClassName: "flex justify-end",
	},
	cell: ({ row, table }) => {
		const meta = getMeta(table);

		return (
			<div className="flex justify-end">
				<ConfirmBtn
					trash
					size="icon"
					onClick={() => meta?.onRemove(row.original)}
				/>
			</div>
		);
	},
};

export const columns: Column[] = [
	handleColumn,
	categoryColumn,
	defaultProductColumn,
	statusColumn,
	actionsColumn,
];
