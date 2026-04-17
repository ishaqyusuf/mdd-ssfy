"use client";

import { getCustomerFormAction } from "@/actions/get-customer-form";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNewSalesFormCustomerPickerQuery } from "../api";
import { useNewSalesFormStore } from "../store";
import { useCreateFormQueryParams } from "../use-create-form-query-params";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";

interface Props {
	mode: "create" | "edit";
	type: "order" | "quote";
	open: boolean;
	required?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function CustomerSelectorDialog(props: Props) {
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement | null>(null);
	const setMeta = useNewSalesFormStore((s) => s.setMeta);
	const patchRecord = useNewSalesFormStore((s) => s.patchRecord);
	const [, setParams] = useCreateFormQueryParams();
	const { params: createCustomerParams, setParams: setCreateCustomerParams } =
		useCreateCustomerParams();
	const [searchQuery, setSearchQuery] = useState("");
	const debouncedQuery = useDebounce(searchQuery, 250);
	const hasSearchText = searchQuery.trim().length > 0;
	const recentCustomers = useNewSalesFormCustomerPickerQuery({
		type: props.type,
		recent: true,
		limit: 5,
	});
	const searchCustomers = useNewSalesFormCustomerPickerQuery({
		query: debouncedQuery,
		type: props.type,
		limit: 10,
	});
	const results = hasSearchText
		? (searchCustomers.data ?? [])
		: (recentCustomers.data ?? []);
	const heading = props.type === "order" ? "Create Order" : "Create Quote";
	const emptyMessage = useMemo(() => {
		if (!hasSearchText)
			return "Recent customers from your last five sales appear here.";
		if (searchCustomers.isPending)
			return "Searching customers and addresses...";
		return "No customers matched that name, phone, profile, or address.";
	}, [hasSearchText, searchCustomers.isPending]);

	useEffect(() => {
		if (!props.open) return;
		const timer = window.setTimeout(() => {
			inputRef.current?.focus();
		}, 50);
		return () => window.clearTimeout(timer);
	}, [props.open]);

	useEffect(() => {
		const createdCustomerId = createCustomerParams?.payload?.customerId;
		if (!createdCustomerId) return;
		let cancelled = false;

		(async () => {
			const createdCustomer = await getCustomerFormAction(createdCustomerId);
			if (cancelled || !createdCustomer?.customerId) return;

			setMeta({
				customerId: createdCustomer.customerId,
				customerProfileId: createdCustomer.profileId
					? Number(createdCustomer.profileId)
					: null,
				billingAddressId: createdCustomer.addressId ?? null,
				shippingAddressId: createdCustomer.addressId ?? null,
				paymentTerm: createdCustomer.netTerm || null,
				taxCode: createdCustomer.taxCode || null,
			});
			patchRecord({
				customer: {
					id: createdCustomer.customerId,
					name: createdCustomer.name,
					businessName: createdCustomer.businessName,
					phoneNo: createdCustomer.phoneNo,
					email: createdCustomer.email,
				},
			});
			if (props.mode === "create") {
				await setParams({
					selectedCustomerId: createdCustomer.customerId,
				});
			}
			setSearchQuery("");
			props.onOpenChange?.(false);
			setCreateCustomerParams(null);
		})().catch(() => {
			if (!cancelled) {
				setCreateCustomerParams(null);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [
		createCustomerParams?.payload?.customerId,
		patchRecord,
		props.mode,
		props.onOpenChange,
		setCreateCustomerParams,
		setMeta,
		setParams,
	]);

	function handleBack() {
		router.push(`/sales-book/${props.type === "order" ? "orders" : "quotes"}`);
	}

	function handleCreateCustomer() {
		setCreateCustomerParams({
			customerForm: true,
			customerId: null,
			search: searchQuery.trim() || null,
		});
	}

	async function handleSelectCustomer(customer: (typeof results)[number]) {
		setMeta({
			customerId: customer.id,
			customerProfileId: customer.profileId ?? null,
			billingAddressId: customer.billingAddressId ?? null,
			shippingAddressId: customer.shippingAddressId ?? null,
			taxCode: customer.taxCode || null,
		});
		patchRecord({
			customer: {
				id: customer.id,
				name: customer.name,
				businessName: customer.businessName,
				phoneNo: customer.phoneNo,
				email: customer.email,
			},
		});
		if (props.mode === "create") {
			await setParams({
				selectedCustomerId: customer.id,
			});
		}
		setSearchQuery("");
		props.onOpenChange?.(false);
	}

	return (
		<Dialog
			open={props.open}
			onOpenChange={(open) => {
				if (props.required && !open) return;
				props.onOpenChange?.(open);
			}}
		>
			<DialogContent
				className="max-w-2xl gap-0 overflow-hidden p-0"
				onEscapeKeyDown={(event) => {
					if (props.required) event.preventDefault();
				}}
				onInteractOutside={(event) => {
					if (props.required) event.preventDefault();
				}}
			>
				<DialogHeader className="border-b bg-gradient-to-r from-slate-50 to-white px-6 py-5">
					<DialogTitle>
						{props.required ? `${heading}: Select Customer` : "Select Customer"}
					</DialogTitle>
					<DialogDescription>
						Search by customer name, phone, profile, or shipping address. When
						empty, you&apos;ll see the five most recent customers used in sales.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 p-6">
					<div className="relative">
						<div className="flex gap-2">
							<div className="relative flex-1">
								<input
									ref={inputRef}
									className="h-12 w-full rounded-xl border border-primary/40 bg-card pl-4 pr-12 text-sm font-medium text-foreground outline-none ring-2 ring-primary/10 placeholder:text-muted-foreground focus:border-primary"
									placeholder="Search customer name, phone, profile, or shipping address"
									type="text"
									value={searchQuery}
									onChange={(event) => setSearchQuery(event.target.value)}
								/>
								<div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center text-muted-foreground">
									{hasSearchText ? (
										<button
											type="button"
											onClick={() => setSearchQuery("")}
											className="hover:text-foreground"
											aria-label="Clear customer search"
										>
											<Icons.X className="size-4" />
										</button>
									) : (
										<Icons.Search className="size-4" />
									)}
								</div>
							</div>
							<Button
								type="button"
								className="h-12 shrink-0"
								onClick={handleCreateCustomer}
							>
								<Icons.Add className="size-4" />
								Create
							</Button>
						</div>
					</div>

					<div className="overflow-hidden rounded-xl border bg-card">
						<div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
							<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
								{hasSearchText ? `${results.length} Results` : "Recent 5"}
							</span>
							<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
								{props.required ? "Required" : "Select"}
							</span>
						</div>

						<div className="max-h-[360px] overflow-y-auto">
							{hasSearchText ? (
								<div className="border-b bg-muted/20 px-4 py-3">
									<div className="flex items-center justify-between gap-3">
										<div className="min-w-0">
											<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
												Create New
											</p>
											<p className="truncate text-sm font-medium text-foreground">
												{searchQuery.trim()}
											</p>
										</div>
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={handleCreateCustomer}
										>
											Create
										</Button>
									</div>
								</div>
							) : null}
							{results.length ? (
								results.map((customer) => (
									<button
										key={customer.id}
										type="button"
										onClick={() => void handleSelectCustomer(customer)}
										className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/40"
									>
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-blue-100 text-xs font-black text-primary">
											{(customer.name || customer.businessName || "C")
												.slice(0, 2)
												.toUpperCase()}
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<p className="truncate text-sm font-semibold text-foreground">
													{customer.name || customer.businessName}
												</p>
												{customer.isBusiness ? (
													<span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
														Business
													</span>
												) : null}
											</div>
											<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
												{customer.phoneNo ? (
													<span>{customer.phoneNo}</span>
												) : null}
												{customer.profileName ? (
													<span>Tier: {customer.profileName}</span>
												) : null}
												{customer.taxName ? (
													<span>{customer.taxName}</span>
												) : null}
											</div>
											{customer.shippingAddress ? (
												<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
													Ship to: {customer.shippingAddress}
												</p>
											) : null}
										</div>
										<Icons.chevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
									</button>
								))
							) : (
								<div className="flex min-h-[220px] items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
									{emptyMessage}
								</div>
							)}
						</div>
					</div>

					<div className="flex items-center justify-between gap-3">
						<p className="text-xs text-muted-foreground">
							You can change the customer later from the invoice summary panel
							before the form is saved.
						</p>
						{props.required ? (
							<Button type="button" variant="outline" onClick={handleBack}>
								Back
							</Button>
						) : (
							<Button
								type="button"
								variant="outline"
								onClick={() => props.onOpenChange?.(false)}
							>
								Cancel
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
