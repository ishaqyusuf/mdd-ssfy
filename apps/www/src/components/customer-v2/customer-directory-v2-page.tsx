"use client";

import { Icons } from "@gnd/ui/icons";

import Link from "@/components/link";
import { useCustomerFilterParams } from "@/hooks/use-customer-filter-params";
import { useCustomerOverviewV2SheetQuery } from "@/hooks/use-customer-overview-v2-sheet-query";
import { useTRPC } from "@/trpc/client";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Input } from "@gnd/ui/input";
import { useTableData } from "@gnd/ui/data-table";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { ComponentType, ReactNode } from "react";

type CustomerRow = {
	id: number;
	name?: string | null;
	businessName?: string | null;
	phoneNo?: string | null;
	phoneNo2?: string | null;
	email?: string | null;
	address?: string | null;
};

type CustomerDirectorySummary = {
	totalCustomers: number;
	businessCustomers: number;
	customersWithEmail: number;
	openQuotes: number;
};

export function CustomerDirectoryV2Page({
	initialSummaryData,
}: {
	initialSummaryData?: CustomerDirectorySummary;
}) {
	const trpc = useTRPC();
	const { filter, setFilter } = useCustomerFilterParams();
	const overviewSheet = useCustomerOverviewV2SheetQuery();
	const summaryQuery = useQuery(
		trpc.customer.getCustomerDirectoryV2Summary.queryOptions({}, {
			initialData: initialSummaryData,
		}),
	);
	const { data, ref, hasNextPage, total } = useTableData({
		filter,
		route: trpc.sales.customersIndex,
	});
	const rows = data as CustomerRow[];
	const visibleBusiness = rows.filter((row) => !!row.businessName).length;
	const visibleWithEmail = rows.filter((row) => !!row.email).length;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="space-y-2">
					<h2 className="text-3xl font-black tracking-tight">
						Customer Directory Overview
					</h2>
					<p className="max-w-2xl text-sm text-muted-foreground">
						Manage customer accounts, review wallet and payment posture, and jump
						directly into the new customer overview workspace.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button asChild variant="outline">
						<Link href="/sales-book/customers">
							<Icons.ExternalLink className="mr-2 size-4" />
							Legacy page
						</Link>
					</Button>
					<Button asChild>
						<Link href="/sales-book/create-order">
							<Icons.FileText className="mr-2 size-4" />
							New sales
						</Link>
					</Button>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<DirectoryStatCard
					description="All tracked customer records"
					icon={Icons.Users}
					label="Total customers"
					value={
						<StatValue
							isPending={summaryQuery.isPending}
							value={summaryQuery.data?.totalCustomers ?? total ?? 0}
						/>
					}
				/>
				<DirectoryStatCard
					description="Business account records"
					icon={Icons.Building2}
					label="Business accounts"
					value={
						<StatValue
							isPending={summaryQuery.isPending}
							value={summaryQuery.data?.businessCustomers ?? visibleBusiness}
						/>
					}
				/>
				<DirectoryStatCard
					description="Customers with an email on file"
					icon={Icons.Mail}
					label="Reachable customers"
					value={
						<StatValue
							isPending={summaryQuery.isPending}
							value={summaryQuery.data?.customersWithEmail ?? visibleWithEmail}
						/>
					}
				/>
				<DirectoryStatCard
					description="Quote records currently in the system"
					icon={Icons.FileText}
					label="Open quotes"
					value={
						<StatValue
							isPending={summaryQuery.isPending}
							value={summaryQuery.data?.openQuotes ?? 0}
						/>
					}
				/>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle>Directory filters</CardTitle>
					<CardDescription>
						Search by customer name, phone, email, or account details.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3 md:grid-cols-[1fr_auto]">
						<div className="relative">
							<Icons.Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								className="pl-9"
								onChange={(event) => {
									setFilter({
										q: event.target.value || null,
									});
								}}
								placeholder="Search customers..."
								value={filter.q || ""}
							/>
						</div>
						<Button
							variant="outline"
							onClick={() =>
								setFilter({
									q: null,
									status: null,
								})
							}
						>
							Clear filters
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card className="overflow-hidden">
				<CardHeader className="border-b bg-muted/20 pb-3">
					<CardTitle>Customers</CardTitle>
					<CardDescription>
						Select a row to open the v2 side sheet or jump to the full-page customer workspace.
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					{rows.length ? (
						<div className="overflow-x-auto">
							<table className="w-full text-left">
								<thead>
									<tr className="border-b bg-muted/10 text-xs uppercase tracking-wide text-muted-foreground">
										<th className="px-6 py-4">Customer</th>
										<th className="px-6 py-4">Contact</th>
										<th className="px-6 py-4">Address</th>
										<th className="px-6 py-4 text-right">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{rows.map((row) => {
										const accountNo = row.phoneNo || `cust-${row.id}`;
										return (
											<tr
												key={row.id}
												className="cursor-pointer hover:bg-muted/20"
												onClick={() => overviewSheet.open(accountNo)}
											>
												<td className="px-6 py-4">
													<div className="flex items-center gap-3">
														<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
															{getInitials(row.businessName || row.name)}
														</div>
														<div className="space-y-1">
															<p className="font-semibold uppercase">
																{row.businessName || row.name || "Unnamed customer"}
															</p>
															<div className="flex items-center gap-2 text-xs text-muted-foreground">
																<span>{accountNo}</span>
																{row.businessName ? (
																	<Badge variant="outline">Business</Badge>
																) : null}
															</div>
														</div>
													</div>
												</td>
												<td className="px-6 py-4 text-sm">
													<div>{row.phoneNo || "No phone"}</div>
													<div className="text-muted-foreground">
														{row.phoneNo2 || row.email || "No secondary contact"}
													</div>
												</td>
												<td className="px-6 py-4 text-sm text-muted-foreground">
													<TextWithTooltip
														className="max-w-[280px]"
														text={row.address || "No primary address"}
													/>
												</td>
												<td
													className="px-6 py-4"
													onClick={(event) => event.stopPropagation()}
												>
													<div className="flex justify-end gap-2">
														<Button
															size="sm"
															variant="outline"
															onClick={() => overviewSheet.open(accountNo)}
														>
															Open sheet
														</Button>
														<Button asChild size="sm">
															<Link href={`/sales-book/customers/v2/${encodeURIComponent(accountNo)}`}>
																Open page
															</Link>
														</Button>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					) : (
						<div className="p-10 text-center text-sm text-muted-foreground">
							No customers matched the current search.
						</div>
					)}
					<div ref={ref} />
					{hasNextPage ? (
						<div className="border-t p-4 text-center text-sm text-muted-foreground">
							Loading more customers...
						</div>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}

function StatValue({
	isPending,
	value,
}: {
	isPending: boolean;
	value: number;
}) {
	if (isPending) {
		return <Skeleton className="h-8 w-24 rounded-md" />;
	}

	return <>{value}</>;
}

function DirectoryStatCard({
	description,
	icon: Icon,
	label,
	value,
}: {
	label: string;
	value: ReactNode;
	description: string;
	icon: ComponentType<{ className?: string }>;
}) {
	return (
		<Card>
			<CardContent className="space-y-3 p-5">
				<div className="flex items-center justify-between">
					<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
						{label}
					</p>
					<div className="rounded-md bg-primary/10 p-2 text-primary">
						<Icon className="size-4" />
					</div>
				</div>
				<div className="text-2xl font-black">{value}</div>
				<p className="text-xs text-muted-foreground">{description}</p>
			</CardContent>
		</Card>
	);
}

function getInitials(value?: string | null) {
	if (!value) return "CU";
	return value
		.split(" ")
		.slice(0, 2)
		.map((segment) => segment[0]?.toUpperCase() || "")
		.join("");
}
