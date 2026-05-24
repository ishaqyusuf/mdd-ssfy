"use client";

import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { InputGroup } from "@gnd/ui/namespace";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import type { SalesFormSelectOption } from "./invoice-pricing-overview";

export type SalesFormInvoiceDetailsPanelProps = {
	type?: "order" | "quote";
	po?: string | null;
	createdAt?: string | null;
	paymentTerm: string;
	paymentTerms: SalesFormSelectOption[];
	paymentDueDate?: string | null;
	goodUntil?: string | null;
	prodDueDate?: string | null;
	deliveryOption: string;
	deliveryOptions: SalesFormSelectOption[];
	onPoChange?: (value: string) => void;
	onCreatedAtChange?: (value: string | null) => void;
	onPaymentTermChange?: (value: string) => void;
	onPaymentDueDateChange?: (value: string | null) => void;
	onGoodUntilChange?: (value: string | null) => void;
	onProdDueDateChange?: (value: string | null) => void;
	onDeliveryOptionChange?: (value: string) => void;
};

function dateInputValue(value?: string | null) {
	if (!value) return "";
	const date = new Date(value);
	if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "";
}

function DateInputField(props: {
	id: string;
	label: string;
	value?: string | null;
	onChange?: (value: string | null) => void;
}) {
	return (
		<label
			htmlFor={props.id}
			className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3"
		>
			<span className="min-w-[96px] text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
				{props.label}
			</span>
			<Input
				id={props.id}
				type="date"
				value={dateInputValue(props.value)}
				onChange={(event) => props.onChange?.(event.target.value || null)}
				className="h-10 flex-1 cursor-pointer border-0 bg-transparent px-0 text-xs font-bold shadow-none focus-visible:ring-0"
			/>
		</label>
	);
}

export function SalesFormInvoiceDetailsPanel(
	props: SalesFormInvoiceDetailsPanelProps,
) {
	const isQuote = props.type === "quote";
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2 text-foreground">
				<Icons.Info size={18} className="text-primary" />
				<h3 className="text-sm font-bold">Global Invoice Details</h3>
			</div>
			<div className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 shadow-sm">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<InputGroup className="bg-card">
						<InputGroup.Addon align="inline-start">
							<InputGroup.Text>PO</InputGroup.Text>
						</InputGroup.Addon>
						<InputGroup.Input
							value={props.po || ""}
							onChange={(event) => props.onPoChange?.(event.target.value)}
							className="h-10 text-xs font-bold"
							placeholder="Number"
						/>
					</InputGroup>
					<DateInputField
						id="invoice-order-date"
						label="Date"
						value={props.createdAt}
						onChange={props.onCreatedAtChange}
					/>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="rounded-lg border bg-card">
						<Select
							value={props.paymentTerm}
							onValueChange={props.onPaymentTermChange}
						>
							<SelectTrigger className="h-10 rounded-lg border-0 bg-card text-xs font-bold">
								<div className="flex items-center gap-2">
									<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
										Net
									</span>
									<SelectValue />
								</div>
							</SelectTrigger>
							<SelectContent>
								{props.paymentTerms.map((term) => (
									<SelectItem key={term.value} value={term.value}>
										{term.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DateInputField
						id="invoice-payment-due-date"
						label={isQuote ? "Good Until" : "Due Date"}
						value={isQuote ? props.goodUntil : props.paymentDueDate}
						onChange={
							isQuote
								? props.onGoodUntilChange
								: props.onPaymentDueDateChange
						}
					/>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{isQuote ? (
						<div className="hidden md:block" />
					) : (
						<DateInputField
							id="invoice-production-due-date"
							label="Production"
							value={props.prodDueDate}
							onChange={props.onProdDueDateChange}
						/>
					)}
					<div className="rounded-lg border bg-card px-3">
						<Select
							value={props.deliveryOption}
							onValueChange={props.onDeliveryOptionChange}
						>
							<SelectTrigger className="h-10 border-0 bg-transparent px-0 text-xs font-bold shadow-none">
								<div className="flex items-center gap-3">
									<span className="min-w-[96px] text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
										Delivery
									</span>
									<SelectValue />
								</div>
							</SelectTrigger>
							<SelectContent>
								{props.deliveryOptions.map((mode) => (
									<SelectItem key={mode.value} value={mode.value}>
										{mode.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>
		</div>
	);
}
