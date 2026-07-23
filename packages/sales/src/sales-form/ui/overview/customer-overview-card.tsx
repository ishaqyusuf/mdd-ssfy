/** @jsxImportSource react */
"use client";

import { Icons } from "@gnd/ui/icons";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { type ReactNode, useMemo, useState } from "react";
import type { SalesFormSelectOption } from "./invoice-pricing-overview";

export type SalesFormCustomerOverviewCardProps = {
	customerName?: string | null;
	accountNumber?: string | number | null;
	customerInitials?: string | null;
	profileValue: string;
	profileOptions: SalesFormSelectOption[];
	billingLines?: string[];
	shippingLines?: string[];
	billingFallback?: string;
	shippingFallback?: string;
	onChangeCustomer?: () => void;
	onEditCustomer?: () => void;
	onProfileChange?: (value: string) => void;
};

export function SalesFormCustomerOverviewCard(
	props: SalesFormCustomerOverviewCardProps,
) {
	const [isExpanded, setIsExpanded] = useState(false);
	const initials = useMemo(() => {
		if (props.customerInitials) return props.customerInitials;
		const base = props.customerName || "Customer";
		return base
			.split(" ")
			.slice(0, 2)
			.map((part) => part[0] || "")
			.join("")
			.toUpperCase();
	}, [props.customerInitials, props.customerName]);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-4">
				<h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
					Customer
				</h3>
				<div className="flex items-center gap-3">
					{props.onEditCustomer ? (
						<button
							aria-label="Edit customer"
							onClick={props.onEditCustomer}
							className="text-xs font-bold text-primary hover:underline"
							type="button"
						>
							Edit
						</button>
					) : null}
					{props.onChangeCustomer ? (
						<button
							aria-label="Change customer"
							onClick={props.onChangeCustomer}
							className="text-xs font-bold text-primary hover:underline"
							type="button"
						>
							Change
						</button>
					) : null}
				</div>
			</div>

			<div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm">
				<div className="flex items-start gap-4 p-4">
					<div className="relative shrink-0">
						<div className="flex h-12 w-12 items-center justify-center rounded-full border bg-blue-100 text-sm font-black text-primary">
							{initials}
						</div>
						<div className="absolute -bottom-1 -right-1 rounded-full border-2 border-card bg-green-500 p-0.5">
							<Icons.Check size={10} className="text-white" strokeWidth={4} />
						</div>
					</div>
					<div className="min-w-0 flex-1">
						<button
							aria-expanded={isExpanded}
							aria-label="Toggle customer address details"
							className="flex w-full items-start justify-between gap-3 text-left"
							onClick={() => setIsExpanded((prev) => !prev)}
							type="button"
						>
							<p className="truncate text-base font-bold leading-tight text-foreground">
								{props.customerName || "Not selected"}
							</p>
							{isExpanded ? (
								<Icons.ChevronUp
									size={16}
									className="shrink-0 text-muted-foreground"
								/>
							) : (
								<Icons.ChevronDown
									size={16}
									className="shrink-0 text-muted-foreground"
								/>
							)}
						</button>
						<p className="mt-0.5 text-xs text-muted-foreground">
							Account #: {props.accountNumber || "N/A"}
						</p>
						<div className="mt-2 flex flex-wrap items-center gap-2">
							<span className="inline-flex items-center rounded-md border bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
								CUSTOMER
							</span>
							<Select
								value={props.profileValue}
								onValueChange={props.onProfileChange}
							>
								<SelectTrigger
									className="h-8 w-[180px] rounded-lg bg-card text-xs font-bold"
									onClick={(event) => event.stopPropagation()}
								>
									<SelectValue placeholder="Select Profile" />
								</SelectTrigger>
								<SelectContent>
									{props.profileOptions.map((profile) => (
										<SelectItem key={profile.value} value={profile.value}>
											{profile.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
				{isExpanded ? (
					<div className="px-4 pb-4">
						<div className="mb-3 h-px w-full bg-border" />
						<div className="space-y-3">
							<AddressBlock
								icon={<Icons.CreditCard size={12} />}
								label="Billing Address"
								lines={props.billingLines}
								fallback={props.billingFallback}
							/>
							<AddressBlock
								icon={<Icons.Truck size={12} />}
								label="Shipping Address"
								lines={props.shippingLines}
								fallback={props.shippingFallback}
							/>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}

function AddressBlock(props: {
	icon: ReactNode;
	label: string;
	lines?: string[];
	fallback?: string;
}) {
	const lines = props.lines?.length ? props.lines : [props.fallback || "N/A"];

	return (
		<div className="space-y-1">
			<span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
				{props.icon}
				{props.label}
			</span>
			{lines.map((line) => (
				<p
					key={line}
					className="border-l-2 border-border pl-4 text-sm font-medium text-foreground"
				>
					{line}
				</p>
			))}
		</div>
	);
}
