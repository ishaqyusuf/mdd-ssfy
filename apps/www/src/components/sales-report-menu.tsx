"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button, buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Skeleton } from "@gnd/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { PermissionScope } from "@/types/auth";

const reportMenuItems = [
	{
		label: "Payment Report",
		href: "/task-events/sales-daily-payment-report-schedule",
		permission: "generateSalesPaymentReport",
	},
] satisfies {
	label: string;
	href: string;
	permission: PermissionScope;
}[];

type Props = {
	variant?: "nav" | "header";
};

export function SalesReportMenu({ variant = "header" }: Props) {
	const auth = useAuth();
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [customerStatementsOpen, setCustomerStatementsOpen] = useState(false);
	const allowedReportMenuItems = reportMenuItems.filter(
		(item) => auth.can?.[item.permission],
	);
	const canViewReports = allowedReportMenuItems.length > 0;
	const requestedReport = searchParams.get("report");

	useEffect(() => {
		if (requestedReport === "customer-statements") {
			setCustomerStatementsOpen(true);
		}
	}, [requestedReport]);

	const setCustomerStatementsReportOpen = (open: boolean) => {
		setCustomerStatementsOpen(open);
		if (!open && requestedReport === "customer-statements") {
			const params = new URLSearchParams(searchParams.toString());
			params.delete("report");
			const queryString = params.toString();
			router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
				scroll: false,
			});
		}
	};

	if (!canViewReports) {
		return null;
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					{variant === "nav" ? (
						<button
							type="button"
							className={cn(
								buttonVariants({
									variant: "ghost",
								}),
								"gap-1.5",
							)}
						>
							<Icons.ChartSpline className="size-4" />
							Reports
							<Icons.ChevronDown className="size-3.5" />
						</button>
					) : (
						<Button type="button" variant="outline" size="sm" className="gap-2">
							<Icons.ChartSpline className="size-4" />
							<span className="hidden lg:inline">Reports</span>
							<Icons.ChevronDown className="size-3.5" />
						</Button>
					)}
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{allowedReportMenuItems.map((item) => (
						<DropdownMenuItem key={item.href} asChild>
							<Link href={item.href} className="gap-2">
								<Icons.ChartSpline className="size-4 shrink-0" />
								<span className="flex-1">{item.label}</span>
								<Icons.ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
							</Link>
						</DropdownMenuItem>
					))}
					<DropdownMenuItem
						className="gap-2"
						onSelect={() => setCustomerStatementsOpen(true)}
					>
						<Icons.FileText className="size-4 shrink-0" />
						<span className="flex-1">Customer Statements</span>
						<Icons.ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<CustomerStatementsReportDialog
				open={customerStatementsOpen}
				onOpenChange={setCustomerStatementsReportOpen}
			/>
		</>
	);
}

function CustomerStatementsReportDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const trpc = useTRPC();
	const [search, setSearch] = useState("");
	const reportQuery = useQuery(
		trpc.customers.getCustomerStatementReport.queryOptions(
			{},
			{
				enabled: open,
				staleTime: 60_000,
			},
		),
	);
	const customers = reportQuery.data?.customers || [];
	const filteredCustomers = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) return customers;

		return customers.filter((customer) =>
			[
				customer.customerName,
				customer.customerEmail,
				customer.accountNo,
				customer.dueOrders,
				customer.dueAmount,
				formatCurrency(customer.dueAmount),
			]
				.map((value) => String(value || "").toLowerCase())
				.some((value) => value.includes(term)),
		);
	}, [customers, search]);
	const filteredDueOrders = filteredCustomers.reduce(
		(total, customer) => total + customer.dueOrders,
		0,
	);
	const filteredDueAmount = filteredCustomers.reduce(
		(total, customer) => total + customer.dueAmount,
		0,
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[min(96vw,900px)] p-0">
				<DialogHeader className="border-b px-5 py-4">
					<DialogTitle>Customer Statements</DialogTitle>
					<DialogDescription>
						Customers with outstanding order balances.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 px-5 py-4">
					<div className="grid gap-3 sm:grid-cols-3">
						<ReportMetric
							label="Customers"
							value={filteredCustomers.length}
							isPending={reportQuery.isPending}
						/>
						<ReportMetric
							label="Due orders"
							value={filteredDueOrders}
							isPending={reportQuery.isPending}
						/>
						<ReportMetric
							label="Due amount"
							value={formatCurrency(filteredDueAmount)}
							isPending={reportQuery.isPending}
						/>
					</div>

					<div className="relative">
						<Icons.Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							className="pl-9"
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search customer statements..."
							value={search}
						/>
					</div>

					<div className="max-h-[60vh] overflow-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Customer name</TableHead>
									<TableHead className="text-right">Due orders</TableHead>
									<TableHead className="text-right">Due amount</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{reportQuery.isPending ? (
									Array.from({ length: 6 }).map((_, index) => (
										<TableRow key={index}>
											<TableCell>
												<Skeleton className="h-4 w-48 rounded-md" />
											</TableCell>
											<TableCell>
												<Skeleton className="ml-auto h-4 w-16 rounded-md" />
											</TableCell>
											<TableCell>
												<Skeleton className="ml-auto h-4 w-24 rounded-md" />
											</TableCell>
										</TableRow>
									))
								) : filteredCustomers.length ? (
									filteredCustomers.map((customer, index) => (
										<TableRow
											key={`${customer.accountNo}-${customer.customerName}-${index}`}
										>
											<TableCell>
												<div className="flex flex-col gap-1">
													<span className="font-medium">
														{customer.customerName}
													</span>
													<div className="flex flex-wrap gap-2">
														{customer.accountNo ? (
															<Badge variant="outline">
																{customer.accountNo}
															</Badge>
														) : null}
														{customer.customerEmail ? (
															<span className="text-xs text-muted-foreground">
																{customer.customerEmail}
															</span>
														) : null}
													</div>
												</div>
											</TableCell>
											<TableCell className="text-right">
												{customer.dueOrders}
											</TableCell>
											<TableCell className="text-right font-medium">
												{formatCurrency(customer.dueAmount)}
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell
											colSpan={3}
											className="h-32 text-center text-muted-foreground"
										>
											{search.trim()
												? "No customer statements match your search."
												: "No customer statements due."}
										</TableCell>
									</TableRow>
								)}
							</TableBody>
							{!reportQuery.isPending && filteredCustomers.length ? (
								<TableFooter>
									<TableRow>
										<TableCell>TOTAL:</TableCell>
										<TableCell className="text-right">
											{filteredDueOrders}
										</TableCell>
										<TableCell className="text-right">
											{formatCurrency(filteredDueAmount)}
										</TableCell>
									</TableRow>
								</TableFooter>
							) : null}
						</Table>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function ReportMetric({
	isPending,
	label,
	value,
}: {
	isPending: boolean;
	label: string;
	value: number | string;
}) {
	return (
		<div className="rounded-md border px-3 py-2">
			<div className="text-xs text-muted-foreground">{label}</div>
			{isPending ? (
				<Skeleton className="mt-2 h-6 w-20 rounded-md" />
			) : (
				<div className="text-lg font-semibold">{value}</div>
			)}
		</div>
	);
}

function formatCurrency(value: number) {
	return Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value || 0);
}
