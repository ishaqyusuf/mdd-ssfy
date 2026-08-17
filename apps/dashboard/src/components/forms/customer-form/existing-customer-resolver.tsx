"use client";

import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { useDebounce } from "@/hooks/use-debounce";
import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import {
	buildCustomerMatchQuery,
	findBlockingCustomerMatches,
	getCustomerMatchSignals,
} from "./customer-match";
import { useCustomerForm } from "./form-context";

const MATCH_LABELS = {
	phone: "Same phone",
	email: "Same email",
	businessName: "Same business",
	name: "Same name",
} as const;

export function ExistingCustomerResolver() {
	const form = useCustomerForm();
	const customerParams = useCreateCustomerParams();
	const params = customerParams.params;
	const trpc = useTRPC();
	const [id, customerType, name, businessName, phoneNo, email] = form.watch([
		"id",
		"customerType",
		"name",
		"businessName",
		"phoneNo",
		"email",
	]);
	const input = useMemo(
		() => ({ customerType, name, businessName, phoneNo, email }),
		[customerType, name, businessName, phoneNo, email],
	);
	const query = buildCustomerMatchQuery(input);
	const debouncedQuery = useDebounce(query, 350);
	const isCreating = !id && !params.customerId;
	const matchesQuery = useQuery(
		trpc.customers.searchCustomers.queryOptions(
			{ query: debouncedQuery ?? undefined },
			{ enabled: isCreating && Boolean(debouncedQuery), staleTime: 30_000 },
		),
	);
	const matches = useMemo(
		() =>
			(matchesQuery.data ?? []).filter(
				(candidate) => candidate.id !== id && candidate.id !== params.customerId,
			),
		[matchesQuery.data, id, params.customerId],
	);
	const blockingMatches = useMemo(
		() => findBlockingCustomerMatches(input, matches),
		[input, matches],
	);

	useEffect(() => {
		const current = form.getValues("existingCustomers") ?? [];
		const currentIds = current
			.map((candidate) => Number(candidate?.id))
			.filter(Number.isFinite)
			.sort((a, b) => a - b)
			.join(",");
		const nextIds = blockingMatches
			.map((candidate) => candidate.id)
			.sort((a, b) => a - b)
			.join(",");
		if (currentIds !== nextIds) {
			form.setValue("existingCustomers", blockingMatches, {
				shouldValidate: false,
			});
		}
	}, [blockingMatches, form]);

	if (!isCreating || !debouncedQuery) return null;
	if (matchesQuery.isFetching && matches.length === 0) {
		return (
			<p
				className="flex items-center gap-2 text-xs text-muted-foreground"
				role="status"
			>
				<Icons.Loader2 className="size-3.5 animate-spin" />
				Checking for matching customers…
			</p>
		);
	}
	if (matches.length === 0) return null;

	const hasPhoneConflict = blockingMatches.length > 0;

	async function handleCustomer(customer: (typeof matches)[number]) {
		if (params.salesType) {
			await customerParams.setParams({
				customerForm: false,
				payload: { customerId: customer.id },
			});
			return;
		}

		await customerParams.setParams({
			customerForm: true,
			customerId: customer.id,
			search: null,
		});
	}

	return (
		<Alert
			className={
				hasPhoneConflict ? "border-amber-500 bg-amber-50/60" : "bg-muted/30"
			}
		>
			<Icons.Search className="size-4" />
			<AlertTitle>
				{hasPhoneConflict
					? "This customer may already exist"
					: "Possible customer matches"}
			</AlertTitle>
			<AlertDescription className="space-y-3">
				<p>
					{hasPhoneConflict
						? "This phone number is already attached to a customer. Use that customer or change the phone number before creating a new record."
						: "Review these records before creating another customer."}
				</p>
				<ul className="space-y-2" aria-label="Matching customers">
					{matches.slice(0, 3).map((customer) => {
						const displayName =
							customer.businessName || customer.name || "Unnamed customer";
						const signals = getCustomerMatchSignals(input, customer);
						return (
							<li
								key={customer.id}
								className="flex flex-col gap-3 rounded-md border bg-background p-3 sm:flex-row sm:items-center"
							>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium text-foreground">
										{displayName}
									</p>
									<p className="truncate text-xs text-muted-foreground">
										{[customer.phoneNo, customer.email]
											.filter(Boolean)
											.join(" · ") || "No contact details"}
									</p>
									{signals.length ? (
										<div className="mt-2 flex flex-wrap gap-1">
											{signals.map((signal) => (
												<Badge key={signal} variant="secondary">
													{MATCH_LABELS[signal]}
												</Badge>
											))}
										</div>
									) : null}
								</div>
								<Button
									type="button"
									size="sm"
									variant={signals.includes("phone") ? "default" : "outline"}
									onClick={() => void handleCustomer(customer)}
								>
									{params.salesType ? "Use customer" : "Open customer"}
								</Button>
							</li>
						);
					})}
				</ul>
			</AlertDescription>
		</Alert>
	);
}
