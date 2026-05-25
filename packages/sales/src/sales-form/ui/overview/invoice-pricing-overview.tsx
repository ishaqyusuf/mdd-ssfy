"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { formatSalesFormCurrency } from "./format";

export type SalesFormSelectOption = {
	value: string;
	label: string;
};

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
	onPaymentMethodChange?: (value: string) => void;
	onTaxCodeChange?: (value: string) => void;
	onLaborCostChange?: (value: number) => void;
	onAddGlobalCost?: () => void;
};

export function SalesFormPricingOverview(props: SalesFormPricingOverviewProps) {
	const showPaymentMethod = props.showPaymentMethod ?? true;
	const showTaxGroup = props.showTaxGroup ?? true;
	const showLaborCost = props.showLaborCost ?? true;
	const showAddOnCost = props.showAddOnCost ?? true;
	const showGrandTotal = props.showGrandTotal ?? true;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2 text-foreground">
				<Icons.CreditCard size={18} className="text-primary" />
				<h3 className="text-sm font-bold text-primary">
					Totals & Pricing (Entire Invoice)
				</h3>
			</div>
			<div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-card p-4 shadow-sm">
				<div className="flex items-center justify-between gap-4">
					<span className="text-sm font-medium text-muted-foreground">
						Subtotal (All Items)
					</span>
					<span className="text-sm font-bold text-foreground">
						{formatSalesFormCurrency(props.subTotal)}
					</span>
				</div>

				{showPaymentMethod ? (
					<div className="flex items-center justify-between gap-4">
						<span className="text-sm font-medium text-muted-foreground">
							Payment Method
						</span>
						<div className="max-w-[190px] flex-1">
							<Select
								value={props.paymentMethod}
								onValueChange={props.onPaymentMethodChange}
							>
								<SelectTrigger className="h-9 rounded-lg bg-muted text-xs font-bold">
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
					<div className="flex items-center justify-between gap-4">
						<span className="text-sm font-medium text-muted-foreground">
							Tax Group
						</span>
						<div className="max-w-[190px] flex-1">
							<Select
								value={props.taxCode}
								onValueChange={props.onTaxCodeChange}
							>
								<SelectTrigger className="h-9 rounded-lg bg-muted text-xs font-bold">
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

				<div className="flex items-center justify-between gap-4">
					<span className="text-sm font-medium text-muted-foreground">
						Tax Amount
					</span>
					<span className="text-sm font-bold text-foreground">
						{formatSalesFormCurrency(props.taxTotal)}
					</span>
				</div>

				{showLaborCost ? (
					<div className="flex items-center justify-between gap-4">
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
								className="h-9 rounded-lg bg-muted pl-6 pr-3 text-right text-xs font-bold"
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

				{showAddOnCost ? (
					<div className="mt-2 flex items-center justify-between gap-4 border-t border-dashed border-border pt-1">
						<Button
							className="gap-1 px-2 text-xs font-bold"
							onClick={props.onAddGlobalCost}
							size="sm"
							type="button"
							variant="ghost"
						>
							<Icons.Plus size={14} />
							Global Add-on Cost
						</Button>
						<span className="text-xs font-bold text-muted-foreground">
							+{formatSalesFormCurrency(props.addOnTotal)}
						</span>
					</div>
				) : null}

				{props.showCcc ? (
					<div className="flex items-center justify-between gap-4">
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
					<div className="mt-2 flex items-center justify-between gap-4 rounded-lg border border-primary/10 bg-primary/5 p-4">
						<div className="flex flex-col">
							<span className="text-xs font-bold uppercase tracking-tighter text-primary">
								Grand Total Due
							</span>
							<span className="text-[10px] text-primary/60">
								Includes all taxes & labor
							</span>
						</div>
						<span className="text-2xl font-black text-primary">
							{formatSalesFormCurrency(props.grandTotal)}
						</span>
					</div>
				) : null}
			</div>
		</div>
	);
}
