"use client";

import { SalesAddressEditButton } from "@/components/sales-customer-edit-button";
import { getSalesOverviewDocumentStatus } from "@/components/sales-overview-system/lib/document-status";
import { useAuth } from "@/hooks/use-auth";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { Separator } from "@gnd/ui/separator";
import { useState } from "react";
import { SectionHeading } from "./section-heading";
import type { GeneralV2AddressAction, SalesOverviewData } from "./types";

function addressText(address?: { lines?: Array<string | null> | null } | null) {
	const lines = address?.lines?.filter(Boolean) ?? [];
	return lines.length ? lines.join(", ") : "No address on file";
}

export function CustomerSection({
	data,
	onEditAddress,
	onEditCustomer,
}: {
	data: SalesOverviewData;
	onEditAddress?: GeneralV2AddressAction;
	onEditCustomer?: () => void;
}) {
	const [addressesOpen, setAddressesOpen] = useState(false);
	const auth = useAuth();
	const customerQuery = useCustomerOverviewQuery();
	const documentStatus = getSalesOverviewDocumentStatus(data);
	const addressEditingLocked = documentStatus.status === "fulfilled";
	const isQuote = data.type === "quote";
	const canEditCustomer =
		Boolean(auth.can?.editSalesCustomers) && !data.isDealerSale;
	const addresses = [
		{
			key: "billing" as const,
			label: "Billing",
			address: data.addressData?.billing,
		},
		{
			key: "shipping" as const,
			label: "Shipping",
			address: data.addressData?.shipping,
		},
	];

	return (
		<section
			className="flex flex-col gap-3"
			aria-labelledby="general-v2-customer"
		>
			<Collapsible open={addressesOpen} onOpenChange={setAddressesOpen}>
				<SectionHeading
					id="general-v2-customer"
					icon={Icons.User}
					title="Customer"
					action={
						canEditCustomer ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button type="button" variant="outline" size="xs">
										<Icons.Edit className="size-3.5" />
										Edit
										<Icons.ChevronDown className="size-3.5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="min-w-40">
									<DropdownMenuGroup>
										<DropdownMenuItem
											className="gap-2"
											disabled={!onEditCustomer}
											onSelect={() => onEditCustomer?.()}
										>
											<Icons.User className="size-4 shrink-0" />
											Customer
										</DropdownMenuItem>
										<DropdownMenuItem
											className="gap-2"
											disabled={addressEditingLocked || !onEditAddress}
											onSelect={() =>
												onEditAddress?.({
													addressId: data.addressData?.shipping?.id,
													addressType: "shipping",
													label: "Shipping address",
												})
											}
										>
											<Icons.Truck className="size-4 shrink-0" />
											Shipping
										</DropdownMenuItem>
										<DropdownMenuItem
											className="gap-2"
											disabled={addressEditingLocked || !onEditAddress}
											onSelect={() =>
												onEditAddress?.({
													addressId: data.addressData?.billing?.id,
													addressType: "billing",
													label: "Billing address",
												})
											}
										>
											<Icons.Home className="size-4 shrink-0" />
											Billing
										</DropdownMenuItem>
									</DropdownMenuGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						) : null
					}
				/>

				<div className="flex flex-col gap-1">
					<Button
						type="button"
						variant="link"
						className="h-auto w-fit justify-start p-0 text-lg font-semibold"
						onClick={() => customerQuery.open(data.accountNo)}
					>
						{data.displayName || "Unnamed customer"}
					</Button>
					<div className="flex items-center justify-between gap-3">
						{data.customerPhone ? (
							<a
								className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
								href={`tel:${data.customerPhone}`}
							>
								<Icons.Phone aria-hidden="true" className="size-3 shrink-0" />
								<span className="truncate">{data.customerPhone}</span>
							</a>
						) : (
							<span />
						)}
						<CollapsibleTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="xs"
								aria-label={addressesOpen ? "Hide addresses" : "Show addresses"}
							>
								Addresses
								<Icons.ChevronDown
									className={addressesOpen ? "size-3.5 rotate-180" : "size-3.5"}
								/>
							</Button>
						</CollapsibleTrigger>
					</div>
				</div>

				<CollapsibleContent className="border-y bg-muted/30">
					{addresses.map(({ key, label, address }, index) => (
						<div key={key}>
							{index > 0 ? <Separator /> : null}
							<div className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-start gap-3 px-3 py-3">
								<strong className="text-xs font-semibold uppercase text-muted-foreground">
									{label}
								</strong>
								<span className="min-w-0 text-xs text-muted-foreground">
									{addressText(address)}
								</span>
								<SalesAddressEditButton
									customerId={data.customerId}
									addressId={address?.id}
									address={key}
									label={`${label} address`}
									readOnly={addressEditingLocked || data.isDealerSale}
									iconOnly
									onEdit={
										onEditAddress
											? () =>
													onEditAddress({
														addressId: address?.id,
														addressType: key,
														label: `${label} address`,
													})
											: undefined
									}
								/>
							</div>
						</div>
					))}
				</CollapsibleContent>
			</Collapsible>

			<div className="flex items-center justify-between gap-3 border-l-2 border-primary bg-muted/40 px-3 py-2.5">
				<div className="flex min-w-0 flex-col gap-0.5">
					<strong className="truncate text-sm">{documentStatus.label}</strong>
					<span className="text-xs text-muted-foreground">
						{data.inboundStatus
							? `Inbound: ${data.inboundStatus}`
							: "Inbound: No status"}
					</span>
				</div>
				<Badge variant="outline">{isQuote ? "Quote" : "Order"}</Badge>
			</div>
		</section>
	);
}
