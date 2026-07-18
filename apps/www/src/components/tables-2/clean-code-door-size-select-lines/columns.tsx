"use client";

import { useCtx } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/use-door-size-select";
import {
	saveComponentPricingUseCase,
	updateComponentPricingUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-pricing-use-case";
import Money from "@/components/_v1/money";
import { AuthGuard } from "@/components/auth-guard";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { _role } from "@/components/sidebar-links";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { doorSwings } from "@/utils/constants";
import { Button } from "@gnd/ui/button";
import {
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export type CleanCodeDoorSizeSelectVariant = {
	path: string;
	size: string;
	sizeIn?: string | null;
	salesPrice?: number | null;
	basePrice?: number | null;
};

export type CleanCodeDoorSizeSelectLineRow = {
	id: string;
	sn: number;
	variant: CleanCodeDoorSizeSelectVariant;
};

type Column = ColumnDef<CleanCodeDoorSizeSelectLineRow>;

export function buildCleanCodeDoorSizeSelectRows(
	variants?: Array<CleanCodeDoorSizeSelectVariant | null | undefined> | null,
) {
	return (variants ?? []).flatMap((variant, index) => {
		if (!variant) return [];

		return [
			{
				id: variant.path || `${variant.size}-${index}`,
				sn: index + 1,
				variant,
			},
		];
	});
}

export function getCleanCodeDoorSizeSelectLineRowId(
	row: CleanCodeDoorSizeSelectLineRow,
) {
	return row.id;
}

const sizeColumn: Column = {
	id: "size",
	header: "Size",
	...sizes.custom(116, 190, 136),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Size",
		className: sizeClass(
			sizes.custom(116, 190, 136),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => <SizeCell row={row.original} />,
};

const priceColumn: Column = {
	id: "price",
	header: "Price",
	...sizes.custom(104, 148, 116),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Price",
		className: sizeClass(sizes.custom(104, 148, 116)),
		contentClassName: "text-right",
	},
	cell: ({ row }) => <PriceCell row={row.original} />,
};

const swingColumn: Column = {
	id: "swing",
	header: "Swing",
	...sizes.custom(104, 154, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Swing",
		className: sizeClass(sizes.custom(104, 154, 118)),
		contentClassName: "flex justify-center",
	},
	cell: ({ row }) => <SwingCell row={row.original} />,
};

const qtyColumn: Column = {
	id: "qty",
	header: "Qty",
	...sizes.custom(84, 118, 94),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Quantity",
		className: sizeClass(sizes.custom(84, 118, 94), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row }) => <QuantityCell row={row.original} name="qty.total" />,
};

const leftHandColumn: Column = {
	id: "lh",
	header: "LH",
	...sizes.custom(84, 118, 94),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Left hand quantity",
		className: sizeClass(sizes.custom(84, 118, 94), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row }) => <QuantityCell row={row.original} name="qty.lh" />,
};

const rightHandColumn: Column = {
	id: "rh",
	header: "RH",
	...sizes.custom(84, 118, 94),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Right hand quantity",
		className: sizeClass(sizes.custom(84, 118, 94), "justify-center"),
		contentClassName: "flex justify-center",
	},
	cell: ({ row }) => <QuantityCell row={row.original} name="qty.rh" />,
};

function SizeCell({ row }: { row: CleanCodeDoorSizeSelectLineRow }) {
	return (
		<div className="flex min-w-0 flex-col">
			<Label className="truncate whitespace-nowrap text-sm font-medium">
				{row.variant.sizeIn}
			</Label>
			<Label className="truncate whitespace-nowrap text-xs text-muted-foreground">
				{row.variant.size}
			</Label>
		</div>
	);
}

function PriceCell({ row }: { row: CleanCodeDoorSizeSelectLineRow }) {
	const ctx = useCtx();
	const [salesPrice, basePrice] = ctx.form.watch([
		`selections.${row.variant.path}.salesPrice`,
		`selections.${row.variant.path}.basePrice`,
	]);

	return (
		<AuthGuard
			rules={[_role.is("Super Admin")]}
			Fallback={<Money value={salesPrice} />}
		>
			<PricePopover
				salesPrice={salesPrice}
				basePrice={basePrice}
				variant={row.variant}
			/>
		</AuthGuard>
	);
}

function SwingCell({ row }: { row: CleanCodeDoorSizeSelectLineRow }) {
	const ctx = useCtx();

	return (
		<FormSelect
			size="sm"
			options={doorSwings}
			name={`selections.${row.variant.path}.swing`}
			control={ctx.form.control}
		/>
	);
}

function QuantityCell({
	row,
	name,
}: {
	row: CleanCodeDoorSizeSelectLineRow;
	name: "qty.total" | "qty.lh" | "qty.rh";
}) {
	const ctx = useCtx();

	return (
		<FormInput
			qtyInputProps={{
				min: 0,
			}}
			type="number"
			control={ctx.form.control}
			size="sm"
			name={`selections.${row.variant.path}.${name}`}
		/>
	);
}

function PricePopover({
	salesPrice,
	basePrice,
	variant,
}: {
	salesPrice?: number | null;
	basePrice?: number | null;
	variant: CleanCodeDoorSizeSelectVariant;
}) {
	const [opened, setOpened] = useState(false);

	return (
		<Popover open={opened} onOpenChange={setOpened}>
			<PopoverTrigger asChild>
				<Button
					size="sm"
					className="h-8"
					variant={salesPrice ? "default" : "destructive"}
				>
					{salesPrice ? <Money value={salesPrice} /> : <>Add Price</>}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				onClick={(event) => {
					event.preventDefault();
				}}
			>
				<PriceControl
					priceUpdated={() => {
						setOpened(false);
					}}
					basePrice={basePrice}
					variant={variant}
				/>
			</PopoverContent>
		</Popover>
	);
}

function PriceControl({
	basePrice,
	variant,
	priceUpdated,
}: {
	basePrice?: number | null;
	variant: CleanCodeDoorSizeSelectVariant;
	priceUpdated?: () => void;
}) {
	const form = useForm({
		defaultValues: {
			price: basePrice || "",
		},
	});
	const ctx = useCtx();

	async function updatePrice() {
		let price: number | null = Number(form.getValues("price"));
		price = price ? Number(price) : null;
		const data = ctx.priceModel?.formData?.priceVariants?.[variant.size];

		if (data?.id) {
			await updateComponentPricingUseCase([
				{
					id: data.id,
					price,
				},
			]);
		} else {
			await saveComponentPricingUseCase([
				{
					id: data?.id,
					price,
					dependenciesUid: ctx.cls.supplierSizeDep(variant.size),
					dykeStepId: ctx.priceModel?.formData.dykeStepId,
					stepProductUid: ctx.priceModel?.formData.stepProductUid,
				},
			]);
		}

		await ctx.cls.fetchUpdatedPrice();
		toast.success("Pricing Updated.");
		ctx.priceChanged(variant.size, price);
		priceUpdated?.();
	}

	return (
		<Form {...form}>
			<CardHeader>
				<CardTitle>Edit Price</CardTitle>
				<CardDescription>{variant.size}</CardDescription>
			</CardHeader>
			<CardContent>
				<FormInput
					size="sm"
					control={form.control}
					name="price"
					label="Price"
					prefix="$"
				/>
			</CardContent>
			<CardFooter className="flex justify-end">
				<Button onClick={updatePrice}>Save</Button>
			</CardFooter>
		</Form>
	);
}

export const columns: Column[] = [
	sizeColumn,
	priceColumn,
	swingColumn,
	qtyColumn,
	leftHandColumn,
	rightHandColumn,
];
