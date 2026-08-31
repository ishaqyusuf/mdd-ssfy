/** @jsxImportSource react */
"use client";

import { buttonVariants } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import type { SalesFormSelectOption } from "./invoice-pricing-overview";
import { normalizeSalesFormPaymentTerm } from "./overview-options";
import { SalesFormSummarySectionHeader } from "./summary-section-header";

export type SalesFormInvoiceDetailsPanelProps = {
	type?: "order" | "quote";
	po?: string | null;
	paymentTerm: string;
	paymentTerms: SalesFormSelectOption[];
	paymentDueDate?: string | null;
	goodUntil?: string | null;
	prodDueDate?: string | null;
	deliveryOption: string;
	deliveryOptions: SalesFormSelectOption[];
	onPoChange?: (value: string) => void;
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

function dateDisplayValue(value?: string | null) {
	const normalized = dateInputValue(value);
	if (!normalized) return "Pick a date";
	const [year, month, day] = normalized.split("-").map(Number);
	if (year === undefined || month === undefined || day === undefined) {
		return "Pick a date";
	}
	const date = new Date(year, month - 1, day);
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

function datePickerValue(value?: string | null) {
	const normalized = dateInputValue(value);
	if (!normalized) return undefined;
	const [year, month, day] = normalized.split("-").map(Number);
	if (year === undefined || month === undefined || day === undefined) {
		return undefined;
	}
	return new Date(year, month - 1, day);
}

function toDateInputValue(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function FieldLabel(props: { htmlFor?: string; children: React.ReactNode }) {
	return (
		<label
			htmlFor={props.htmlFor}
			className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground"
		>
			{props.children}
		</label>
	);
}

function DateInputField(props: {
	id: string;
	label: string;
	value?: string | null;
	onChange?: (value: string | null) => void;
	disabled?: boolean;
	highlightToday?: boolean;
}) {
	const selectedDate = datePickerValue(props.value);
	return (
		<div className="grid gap-1.5">
			<FieldLabel htmlFor={props.id}>{props.label}</FieldLabel>
			<Popover>
				<PopoverTrigger
					id={props.id}
					type="button"
					disabled={props.disabled}
					className={cn(
						buttonVariants({ variant: "outline" }),
						"h-10 w-full justify-start bg-background text-left text-xs font-bold",
						!selectedDate && "text-muted-foreground",
					)}
				>
					{dateDisplayValue(props.value)}
					<Icons.CalendarIcon className="ml-auto size-4 opacity-50" />
				</PopoverTrigger>
				<PopoverContent align="start" className="w-auto p-0">
					<Calendar
						classNames={
							props.highlightToday
								? { today: "rounded-full bg-accent/30" }
								: undefined
						}
						mode="single"
						selected={selectedDate}
						onSelect={(date) =>
							props.onChange?.(date ? toDateInputValue(date) : null)
						}
						initialFocus
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}

export function SalesFormInvoiceDetailsPanel(
	props: SalesFormInvoiceDetailsPanelProps,
) {
	const isQuote = props.type === "quote";
	const hasAutomaticOrderDueDate =
		!isQuote && normalizeSalesFormPaymentTerm(props.paymentTerm) !== "None";
	return (
		<>
			<section className="border-b border-border/70 pb-6">
				<SalesFormSummarySectionHeader
					description="Purchase order, payment terms, and fulfillment."
					icon={<Icons.Info size={18} />}
					title="Global Invoice Details"
				/>
				<div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
					<div className="grid gap-1.5">
						<FieldLabel htmlFor="invoice-po">P.O. Number</FieldLabel>
						<Input
							id="invoice-po"
							value={props.po || ""}
							onChange={(event) => props.onPoChange?.(event.target.value)}
							className="h-10 bg-background text-xs font-bold"
							placeholder="Purchase order number"
						/>
					</div>
					{isQuote ? null : (
						<div className="grid gap-1.5">
							<FieldLabel htmlFor="invoice-payment-term">Net</FieldLabel>
							<select
								id="invoice-payment-term"
								value={normalizeSalesFormPaymentTerm(props.paymentTerm)}
								onChange={(event) =>
									props.onPaymentTermChange?.(event.target.value)
								}
								className="h-10 w-full rounded-md border border-border bg-background px-3 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								{props.paymentTerms.map((term) => (
									<option key={term.value} value={term.value}>
										{term.label}
									</option>
								))}
							</select>
						</div>
					)}
					{isQuote ? (
						<DateInputField
							id="invoice-good-until"
							label="Good Until"
							value={props.goodUntil}
							onChange={props.onGoodUntilChange}
						/>
					) : null}
					<div className="grid gap-1.5">
						<FieldLabel htmlFor="invoice-fulfillment">Fulfillment</FieldLabel>
						<Select
							value={props.deliveryOption}
							onValueChange={(value) => props.onDeliveryOptionChange?.(value)}
						>
							<SelectTrigger
								id="invoice-fulfillment"
								className="h-10 bg-background text-xs font-bold"
							>
								<SelectValue placeholder="Select fulfillment" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{props.deliveryOptions.map((mode) => (
										<SelectItem key={mode.value} value={mode.value}>
											{mode.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
				</div>
			</section>
			{isQuote ? null : (
				<section className="border-b border-border/70 py-6">
					<SalesFormSummarySectionHeader
						description="Production and fulfillment target dates for this order."
						icon={<Icons.CalendarIcon size={18} />}
						title="Due Dates"
					/>
					<div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
						<DateInputField
							highlightToday
							id="invoice-production-due-date"
							label="Production"
							value={props.prodDueDate}
							onChange={props.onProdDueDateChange}
						/>
						<DateInputField
							disabled={hasAutomaticOrderDueDate}
							id="invoice-payment-due-date"
							label="Fulfillment"
							value={props.paymentDueDate}
							onChange={props.onPaymentDueDateChange}
						/>
					</div>
				</section>
			)}
		</>
	);
}
