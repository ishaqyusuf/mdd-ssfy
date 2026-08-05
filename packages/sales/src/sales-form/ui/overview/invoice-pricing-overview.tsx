/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import {
	type CostPriceBreakdownContext,
	CostPriceBreakdownHover,
	type CostPriceBreakdownInput,
} from "../workflow/cost-price-breakdown-hover";
import { formatSalesFormCurrency } from "./format";
import { SalesFormSummarySectionHeader } from "./summary-section-header";

export type SalesFormSelectOption = {
	value: string;
	label: string;
};

export const salesFormAdditionalCostOptions = [
	{ label: "Discount", type: "Discount" },
	{ label: "Delivery", type: "Delivery" },
	{ label: "Flat Labor Cost", type: "FlatLabor" },
	{ label: "Custom", type: "CustomNonTaxxable" },
] as const;

export type SalesFormAdditionalCostOption =
	(typeof salesFormAdditionalCostOptions)[number];

export type SalesFormAdditionalCostLine = {
	index: number;
	label: string;
	type: string;
	amount: number;
};

export function createSalesFormAdditionalCost(
	option: SalesFormAdditionalCostOption,
) {
	return {
		label: option.label,
		type: option.type,
		amount: 0,
		taxxable: false,
	};
}

export type SalesFormPricingOverviewProps = {
	subTotal?: number | null;
	taxTotal?: number | null;
	grandTotal?: number | null;
	ccc?: number | null;
	cccPercentage?: number | null;
	addOnTotal?: number | null;
	laborCost?: number | null;
	paymentMethod: string;
	paymentMethods: SalesFormSelectOption[];
	taxCode: string;
	taxOptions: SalesFormSelectOption[];
	showCcc?: boolean;
	showPaymentMethod?: boolean;
	showTaxGroup?: boolean;
	showLaborCost?: boolean;
	showAddOnCost?: boolean;
	showGrandTotal?: boolean;
	additionalCosts?: SalesFormAdditionalCostLine[];
	totalBreakdown?: {
		context?: CostPriceBreakdownContext | null;
		subTotal?: CostPriceBreakdownInput;
		grandTotal?: CostPriceBreakdownInput;
	};
	onPaymentMethodChange?: (value: string) => void;
	onTaxCodeChange?: (value: string) => void;
	onLaborCostChange?: (value: number) => void;
	onAddAdditionalCost?: (
		input: ReturnType<typeof createSalesFormAdditionalCost>,
	) => void;
	onUpdateAdditionalCost?: (
		index: number,
		patch: Partial<Pick<SalesFormAdditionalCostLine, "label" | "amount">>,
	) => void;
	onRemoveAdditionalCost?: (index: number) => void;
};

export function SalesFormPricingOverview(props: SalesFormPricingOverviewProps) {
	const showPaymentMethod = props.showPaymentMethod ?? true;
	const showTaxGroup = props.showTaxGroup ?? true;
	const showLaborCost = props.showLaborCost ?? true;
	const showAddOnCost = props.showAddOnCost ?? true;
	const showGrandTotal = props.showGrandTotal ?? true;
	return (
		<section className="border-b border-border/70 pb-6">
			<SalesFormSummarySectionHeader
				description="Invoice-wide charges, tax, and payment settings."
				icon={<Icons.CreditCard size={18} />}
				title="Totals & Pricing"
			/>
			<div className="divide-y divide-border/70">
				<div className="flex items-center justify-between gap-4 pb-3">
					<span className="text-sm font-medium text-muted-foreground">
						Subtotal (All Items)
					</span>
					<span className="text-sm font-bold text-foreground">
						<CostPriceBreakdownHover
							breakdown={{
								...props.totalBreakdown?.subTotal,
								displayPrice:
									props.totalBreakdown?.subTotal?.displayPrice ??
									props.subTotal,
							}}
							context={props.totalBreakdown?.context}
						>
							<span>{formatSalesFormCurrency(props.subTotal)}</span>
						</CostPriceBreakdownHover>
					</span>
				</div>

				{showPaymentMethod ? (
					<div className="flex items-center justify-between gap-4 py-3">
						<span className="text-sm font-medium text-muted-foreground">
							Payment Method
						</span>
						<div className="max-w-[190px] flex-1">
							<Select
								value={props.paymentMethod}
								onValueChange={props.onPaymentMethodChange}
							>
								<SelectTrigger className="h-9 rounded-md bg-background text-xs font-bold">
									<SelectValue placeholder="Select Payment Method" />
								</SelectTrigger>
								<SelectContent>
									{props.paymentMethods.map((mode) => (
										<SelectItem key={mode.value} value={mode.value}>
											{mode.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				) : null}

				{showTaxGroup ? (
					<div className="flex items-center justify-between gap-4 py-3">
						<span className="text-sm font-medium text-muted-foreground">
							Tax Group
						</span>
						<div className="max-w-[190px] flex-1">
							<Select
								value={props.taxCode}
								onValueChange={props.onTaxCodeChange}
							>
								<SelectTrigger className="h-9 rounded-md bg-background text-xs font-bold">
									<SelectValue placeholder="Select Tax Group" />
								</SelectTrigger>
								<SelectContent>
									{props.taxOptions.map((tax) => (
										<SelectItem key={tax.value} value={tax.value}>
											{tax.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				) : null}

				<div className="flex items-center justify-between gap-4 py-3">
					<span className="text-sm font-medium text-muted-foreground">
						Tax Amount
					</span>
					<span className="text-sm font-bold text-foreground">
						{formatSalesFormCurrency(props.taxTotal)}
					</span>
				</div>

				{showLaborCost ? (
					<div className="flex items-center justify-between gap-4 py-3">
						<div className="flex flex-col">
							<span className="text-sm font-medium text-muted-foreground">
								Total Labor Cost
							</span>
							<span className="text-[10px] text-muted-foreground">
								Global calculation
							</span>
						</div>
						<div className="relative w-[120px]">
							<span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">
								$
							</span>
							<Input
								className="h-9 rounded-md bg-background pl-6 pr-3 text-right text-xs font-bold"
								type="number"
								step="0.01"
								value={Number(props.laborCost || 0)}
								onChange={(event) =>
									props.onLaborCostChange?.(Number(event.target.value || 0))
								}
							/>
						</div>
					</div>
				) : null}

				{showAddOnCost && props.onAddAdditionalCost ? (
					<section className="space-y-4 py-5">
						<div className="flex items-start justify-between gap-4">
							<div className="space-y-1">
								<div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
									<Icons.Plus size={15} className="text-primary" />
									Additional Costs
								</div>
								<p className="text-xs leading-5 text-muted-foreground">
									Select a cost type, then edit its label and amount.
								</p>
							</div>
							<span className="text-xs font-bold text-muted-foreground">
								+{formatSalesFormCurrency(props.addOnTotal)}
							</span>
						</div>
						{props.additionalCosts?.length ? (
							<div className="space-y-2">
								<div className="flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
									<span className="min-w-0 flex-1">Label</span>
									<span className="w-28 shrink-0">Amount</span>
									<span className="w-9 shrink-0 sr-only">Actions</span>
								</div>
								{props.additionalCosts.map((cost, rowIndex) => (
									<div
										key={`${cost.type}-${cost.index}`}
										className="flex items-center gap-2"
									>
										<Input
											aria-label={`Additional cost ${rowIndex + 1} label`}
											className="h-9 min-w-0 flex-1 bg-background text-xs font-medium"
											value={cost.label}
											onChange={(event) =>
												props.onUpdateAdditionalCost?.(cost.index, {
													label: event.target.value,
												})
											}
										/>
										<div className="relative w-28 shrink-0">
											<span className="pointer-events-none absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">
												$
											</span>
											<Input
												aria-label={`Additional cost ${rowIndex + 1} amount`}
												className="h-9 bg-background pl-6 pr-2 text-right text-xs font-bold"
												type="number"
												min="0"
												step="0.01"
												placeholder="0.00"
												value={cost.amount || ""}
												onChange={(event) =>
													props.onUpdateAdditionalCost?.(cost.index, {
														amount: Number(event.target.value || 0),
													})
												}
											/>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											aria-label={`Delete ${cost.label} additional cost`}
											className="size-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
											onClick={() => props.onRemoveAdditionalCost?.(cost.index)}
										>
											<Icons.Trash2 className="size-4" />
										</Button>
									</div>
								))}
							</div>
						) : (
							<p className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
								No additional costs added.
							</p>
						)}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-9"
								>
									<Icons.Plus className="size-3.5" />
									Add Cost
									<Icons.ChevronDown className="size-3.5 text-muted-foreground" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-48">
								{salesFormAdditionalCostOptions.map((option) => (
									<DropdownMenuItem
										key={option.type}
										onSelect={() =>
											props.onAddAdditionalCost?.(
												createSalesFormAdditionalCost(option),
											)
										}
									>
										{option.label}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</section>
				) : null}

				{props.showCcc ? (
					<div className="flex items-center justify-between gap-4 py-3">
						<div className="flex flex-col">
							<span className="text-sm font-medium text-muted-foreground">
								CCC ({Number(props.cccPercentage || 0)}%)
							</span>
							<span className="text-[10px] text-muted-foreground">
								Credit card processing surcharge
							</span>
						</div>
						<span className="text-sm font-bold text-foreground">
							{formatSalesFormCurrency(props.ccc)}
						</span>
					</div>
				) : null}

				{showGrandTotal ? (
					<div className="flex items-center justify-between gap-4 pt-5">
						<div className="flex flex-col">
							<span className="text-xs font-bold uppercase tracking-tighter text-primary">
								Grand Total Due
							</span>
							<span className="text-[10px] text-primary/60">
								Includes all taxes & labor
							</span>
						</div>
						<span className="text-2xl font-black text-primary">
							<CostPriceBreakdownHover
								breakdown={{
									...props.totalBreakdown?.grandTotal,
									displayPrice:
										props.totalBreakdown?.grandTotal?.displayPrice ??
										props.grandTotal,
								}}
								context={props.totalBreakdown?.context}
							>
								<span>{formatSalesFormCurrency(props.grandTotal)}</span>
							</CostPriceBreakdownHover>
						</span>
					</div>
				) : null}
			</div>
		</section>
	);
}
