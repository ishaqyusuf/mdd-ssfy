"use client";

import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { useDebounce } from "@/hooks/use-debounce";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

function CustomerDetails({
	customer,
}: {
	customer: {
		id: number;
		name?: string | null;
		businessName?: string | null;
		phoneNo?: string | null;
		phoneNo2?: string | null;
		email?: string | null;
		address?: string | null;
		netTerm?: string | null;
		officeVisibility?: string | null;
		profile?: { title?: string | null } | null;
		taxProfiles?: Array<{
			taxCode: string;
			tax: { percentage: number; title: string };
		}>;
		dealerOwner?: { companyName?: string | null; name?: string | null } | null;
	};
}) {
	const taxProfiles = customer.taxProfiles
		?.map(
			(entry) =>
				`${entry.tax.title} (${entry.tax.percentage}% · ${entry.taxCode})`,
		)
		.join(", ");
	const owner = customer.dealerOwner?.companyName || customer.dealerOwner?.name;
	const rows = [
		["Account", `CUST-${customer.id}`],
		["Name", customer.name],
		["Business", customer.businessName],
		["Profile", customer.profile?.title],
		["Primary phone", customer.phoneNo],
		["Secondary phone", customer.phoneNo2],
		["Email", customer.email],
		["Address", customer.address],
		["Tax", taxProfiles],
		["Net term", customer.netTerm],
		["Dealer owner", owner],
		["Office visibility", customer.officeVisibility],
	] as const;

	return (
		<div className="space-y-3">
			<div>
				<p className="font-medium text-foreground">
					{customer.businessName || customer.name || "Unnamed customer"}
				</p>
				<p className="text-xs text-muted-foreground">
					Complete customer information
				</p>
			</div>
			<dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs">
				{rows.map(([label, value]) => (
					<div key={label} className="contents">
						<dt className="text-muted-foreground">{label}</dt>
						<dd className="break-words text-right font-medium text-foreground">
							{value || "—"}
						</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

export function ExistingCustomerResolver() {
	const form = useCustomerForm();
	const customerParams = useCreateCustomerParams();
	const params = customerParams.params;
	const trpc = useTRPC();
	const railRef = useRef<HTMLUListElement>(null);
	const resizeObserverRef = useRef<ResizeObserver | null>(null);
	const [scrollState, setScrollState] = useState({ left: false, right: false });
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
				(candidate) =>
					candidate.id !== id && candidate.id !== params.customerId,
			),
		[matchesQuery.data, id, params.customerId],
	);
	const blockingMatches = useMemo(
		() => findBlockingCustomerMatches(input, matches),
		[input, matches],
	);
	const updateScrollState = useCallback(() => {
		const rail = railRef.current;
		if (!rail) return;
		const left = rail.scrollLeft > 2;
		const right = rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 2;
		setScrollState((current) =>
			current.left === left && current.right === right
				? current
				: { left, right },
		);
	}, []);
	const setRailRef = useCallback(
		(rail: HTMLUListElement | null) => {
			const previousRail = railRef.current;
			if (previousRail) {
				previousRail.removeEventListener("scroll", updateScrollState);
			}
			resizeObserverRef.current?.disconnect();
			railRef.current = rail;
			if (!rail) return;

			rail.addEventListener("scroll", updateScrollState, { passive: true });
			resizeObserverRef.current = new ResizeObserver(updateScrollState);
			resizeObserverRef.current.observe(rail);
			requestAnimationFrame(updateScrollState);
		},
		[updateScrollState],
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
			<output className="flex items-center gap-2 text-xs text-muted-foreground">
				<Icons.Loader2 className="size-3.5 animate-spin" />
				Checking for matching customers…
			</output>
		);
	}
	if (matches.length === 0) return null;

	const hasPhoneConflict = blockingMatches.length > 0;
	const visibleMatches = matches.slice(0, 10);

	function scrollRail(direction: -1 | 1) {
		railRef.current?.scrollBy({
			behavior: "smooth",
			left: direction * 240,
		});
	}

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
		<section
			aria-label="Matching customers"
			className="w-full min-w-0 max-w-full space-y-2 overflow-hidden rounded-md border bg-muted/20 p-2.5 duration-300 animate-in fade-in-0 slide-in-from-top-2 motion-reduce:animate-none [contain:inline-size]"
		>
			<div className="flex items-start justify-between gap-3 px-0.5">
				<div className="min-w-0">
					<div className="flex items-center gap-1.5">
						<Icons.Search className="size-3.5 shrink-0 text-muted-foreground" />
						<p className="text-xs font-medium text-foreground">
							{hasPhoneConflict
								? "Existing customer found"
								: `${visibleMatches.length} possible ${visibleMatches.length === 1 ? "match" : "matches"}`}
						</p>
					</div>
					<p
						className={cn(
							"mt-0.5 text-[11px] text-muted-foreground",
							hasPhoneConflict && "text-amber-700 dark:text-amber-400",
						)}
					>
						{hasPhoneConflict
							? "Use the matching customer or change the phone number."
							: "Hover or focus a customer to review all details."}
					</p>
				</div>
				<div className="flex shrink-0 gap-1">
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="size-7"
						disabled={!scrollState.left}
						onClick={() => scrollRail(-1)}
						aria-label="Scroll matching customers left"
					>
						<Icons.ChevronLeft className="size-3.5" />
					</Button>
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="size-7"
						disabled={!scrollState.right}
						onClick={() => scrollRail(1)}
						aria-label="Scroll matching customers right"
					>
						<Icons.ChevronRight className="size-3.5" />
					</Button>
				</div>
			</div>

			<TooltipProvider delayDuration={220}>
				<ul
					key={visibleMatches.map((customer) => customer.id).join("-")}
					ref={setRailRef}
					className="flex w-full min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-0.5 scrollbar-hide"
				>
					{visibleMatches.map((customer) => {
						const displayName =
							customer.businessName || customer.name || "Unnamed customer";
						const signals = getCustomerMatchSignals(input, customer);
						const isPhoneMatch = signals.includes("phone");
						return (
							<li
								key={customer.id}
								className="min-w-[218px] max-w-[218px] snap-start"
							>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											className={cn(
												"group flex h-full min-h-[104px] w-full flex-col rounded-md border bg-background p-3 text-left shadow-sm transition-[border-color,background-color,box-shadow] hover:border-foreground/25 hover:bg-muted/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
												isPhoneMatch &&
													"border-amber-500 bg-amber-50/60 hover:border-amber-600 hover:bg-amber-50 dark:bg-amber-950/20",
											)}
											onClick={() => void handleCustomer(customer)}
											aria-label={`${params.salesType ? "Use" : "Open"} customer ${displayName}`}
										>
											<div className="flex w-full items-start justify-between gap-2">
												<p className="line-clamp-2 min-w-0 font-medium leading-tight text-foreground">
													{displayName}
												</p>
												<span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
													{customer.profile?.title || "No profile"}
												</span>
											</div>
											<p className="mt-1 truncate text-xs text-muted-foreground">
												{customer.phoneNo ||
													customer.email ||
													"No contact details"}
											</p>
											<div className="mt-auto flex w-full items-end justify-between gap-2 pt-2">
												<div className="flex min-w-0 flex-wrap gap-1">
													{signals.slice(0, 2).map((signal) => (
														<Badge
															key={signal}
															variant="secondary"
															className="text-[10px]"
														>
															{MATCH_LABELS[signal]}
														</Badge>
													))}
												</div>
												<span className="shrink-0 text-[11px] font-medium text-foreground">
													{params.salesType ? "Use" : "Open"} →
												</span>
											</div>
										</button>
									</TooltipTrigger>
									<TooltipContent
										side="top"
										align="start"
										className="w-80 max-w-[calc(100vw-2rem)]"
									>
										<CustomerDetails customer={customer} />
									</TooltipContent>
								</Tooltip>
							</li>
						);
					})}
				</ul>
			</TooltipProvider>
		</section>
	);
}
