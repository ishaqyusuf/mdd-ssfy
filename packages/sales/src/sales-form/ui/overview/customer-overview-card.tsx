/** @jsxImportSource react */
"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@gnd/ui/alert-dialog";
import { Icons } from "@gnd/ui/icons";
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
	onEditBillingAddress?: () => void;
	onEditShippingAddress?: () => void;
	onProfileChange?: (value: string) => void;
	onUseBillingAddressForShipping?: () => void;
	shippingMatchesBilling?: boolean;
};

export function shouldShowSameAsBillingAction({
	hasAction,
	shippingMatchesBilling,
}: {
	hasAction: boolean;
	shippingMatchesBilling?: boolean;
}) {
	return hasAction && shippingMatchesBilling === false;
}

export function SalesFormCustomerOverviewCard(
	props: SalesFormCustomerOverviewCardProps,
) {
	const [isExpanded, setIsExpanded] = useState(true);
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
							<select
								aria-label="Customer profile"
								value={props.profileValue}
								onChange={(event) =>
									props.onProfileChange?.(event.target.value)
								}
								onClick={(event) => event.stopPropagation()}
								disabled={!props.onProfileChange}
								className="h-8 w-[180px] rounded-lg border border-border bg-card px-2 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							>
								{props.profileOptions.length ? null : (
									<option value="none">Select Profile</option>
								)}
								{props.profileOptions.map((profile) => (
									<option key={profile.value} value={profile.value}>
										{profile.label}
									</option>
								))}
							</select>
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
								onEdit={props.onEditBillingAddress}
							/>
							<AddressBlock
								icon={<Icons.Truck size={12} />}
								label="Shipping Address"
								lines={props.shippingLines}
								fallback={props.shippingFallback}
								onEdit={props.onEditShippingAddress}
							/>
							{shouldShowSameAsBillingAction({
								hasAction: Boolean(props.onUseBillingAddressForShipping),
								shippingMatchesBilling: props.shippingMatchesBilling,
							}) ? (
								<AlertDialog>
									<AlertDialogTrigger className="ml-3 inline-flex h-8 items-center rounded-md px-2 text-xs font-bold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
										Same as billing
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												Use billing address for shipping?
											</AlertDialogTitle>
											<AlertDialogDescription>
												The current shipping selection will be replaced with the
												billing address for this sale. The saved shipping
												address will not be deleted.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Cancel</AlertDialogCancel>
											<AlertDialogAction
												onClick={props.onUseBillingAddressForShipping}
											>
												Same as billing
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							) : null}
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
	onEdit?: () => void;
}) {
	const lines = props.lines?.length ? props.lines : [props.fallback || "N/A"];
	const content = (
		<>
			<span className="flex items-center justify-between gap-3">
				<span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
					{props.icon}
					{props.label}
				</span>
				{props.onEdit ? (
					<span className="text-xs font-bold text-primary">Edit</span>
				) : null}
			</span>
			<span className="mt-1 block border-l-2 border-border pl-4">
				{lines.map((line) => (
					<span
						key={line}
						className="block text-sm font-medium text-foreground"
					>
						{line}
					</span>
				))}
			</span>
		</>
	);

	return props.onEdit ? (
		<button
			aria-label={`Edit ${props.label.toLowerCase()}`}
			className="w-full cursor-pointer rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			onClick={props.onEdit}
			type="button"
		>
			{content}
		</button>
	) : (
		<div className="w-full rounded-lg px-3 py-2">{content}</div>
	);
}
