"use client";

import { DataTable as CustomerStatementLinesDataTable } from "@/components/tables-2/customer-statement-lines/data-table";
import { DataTable as CustomerStatementReportDataTable } from "@/components/tables-2/customer-statement-report/data-table";
import { useAuth } from "@/hooks/use-auth";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { downloadCustomerStatementPdf } from "@/lib/customer-statement-print";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button, buttonVariants } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Skeleton } from "@gnd/ui/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { PermissionScope } from "@/types/auth";
import type { RouterOutputs } from "@api/trpc/routers/_app";

type CustomerStatementDetail =
	RouterOutputs["customers"]["getCustomerStatementDetail"];

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

export function useSalesReportMenuState() {
	const auth = useAuth();
	const [reportParams, setReportParams] = useQueryStates({
		report: parseAsString,
		statementCustomerId: parseAsInteger,
		statementStatus: parseAsString,
	});
	const allowedReportMenuItems = reportMenuItems.filter(
		(item) => auth.can?.[item.permission],
	);
	const canViewCustomerStatements = !!auth.can?.generateSalesStatementReport;
	const canViewReports =
		allowedReportMenuItems.length > 0 || canViewCustomerStatements;
	const customerStatementsOpen =
		canViewCustomerStatements && reportParams.report === "customer-statements";

	const setCustomerStatementsReportOpen = (open: boolean) => {
		if (open) {
			setReportParams({
				report: "customer-statements",
				statementCustomerId: null,
				statementStatus: null,
			});
			return;
		}
		setReportParams({
			report: null,
			statementCustomerId: null,
			statementStatus: null,
		});
	};

	return {
		allowedReportMenuItems,
		canViewCustomerStatements,
		canViewReports,
		customerStatementsOpen,
		reportParams,
		setCustomerStatementsReportOpen,
		setReportParams,
	};
}

export type SalesReportMenuState = ReturnType<typeof useSalesReportMenuState>;

export function SalesReportMenuContent({
	state,
}: {
	state: SalesReportMenuState;
}) {
	return (
		<>
			{state.allowedReportMenuItems.map((item) => (
				<DropdownMenuItem key={item.href} asChild>
					<Link href={item.href} className="gap-2">
						<Icons.ChartSpline className="size-4 shrink-0" />
						<span className="flex-1">{item.label}</span>
						<Icons.ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
					</Link>
				</DropdownMenuItem>
			))}
			{state.canViewCustomerStatements ? (
				<DropdownMenuItem
					className="gap-2"
					onSelect={() => state.setCustomerStatementsReportOpen(true)}
				>
					<Icons.FileText className="size-4 shrink-0" />
					<span className="flex-1">Customer Statements</span>
					<Icons.ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
				</DropdownMenuItem>
			) : null}
		</>
	);
}

export function SalesReportMenuDialog({
	state,
}: {
	state: SalesReportMenuState;
}) {
	return (
		<CustomerStatementsReportDialog
			open={state.customerStatementsOpen}
			onOpenChange={state.setCustomerStatementsReportOpen}
			params={state.reportParams}
			setParams={state.setReportParams}
		/>
	);
}

export function SalesReportMenuDropdown({
	state,
	variant = "header",
}: Props & {
	state: SalesReportMenuState;
}) {
	if (!state.canViewReports) {
		return null;
	}

	return (
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
				<SalesReportMenuContent state={state} />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function SalesReportMenu({ variant = "header" }: Props) {
	const state = useSalesReportMenuState();

	if (!state.canViewReports) {
		return null;
	}

	return (
		<>
			<SalesReportMenuDropdown state={state} variant={variant} />
			<SalesReportMenuDialog state={state} />
		</>
	);
}

function CustomerStatementsReportDialog({
	open,
	onOpenChange,
	params,
	setParams,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	params: {
		report: string | null;
		statementCustomerId: number | null;
		statementStatus: string | null;
	};
	setParams: (
		params: {
			report?: string | null;
			statementCustomerId?: number | null;
			statementStatus?: string | null;
		} | null,
	) => void;
}) {
	const trpc = useTRPC();
	const [search, setSearch] = useState("");
	const [selectedSalesIds, setSelectedSalesIds] = useState<number[]>([]);
	const [includeSalesInvoicesInPdf, setIncludeSalesInvoicesInPdf] =
		useState(false);
	const [isDownloadingStatementPdf, setIsDownloadingStatementPdf] =
		useState(false);
	const sentReturnTimeoutRef = useRef<number | null>(null);
	const selectedCustomerId = params.statementCustomerId;
	const statementStatus = params.statementStatus;
	const activeTab = selectedCustomerId
		? "statement-overview"
		: "statement-list";

	const reportQuery = useQuery(
		trpc.customers.getCustomerStatementReport.queryOptions(
			{},
			{
				enabled: open,
				staleTime: 60_000,
			},
		),
	);
	const detailQuery = useQuery(
		trpc.customers.getCustomerStatementDetail.queryOptions(
			{
				customerId: selectedCustomerId || 0,
			},
			{
				enabled: open && !!selectedCustomerId,
				staleTime: 30_000,
			},
		),
	);
	const statementTrigger = useNotificationTrigger({
		executingToast: "Sending customer statement...",
		taskTitle: "Sending customer statement",
		taskDescription:
			"We will keep watching this statement email until it finishes.",
		successToast: "Customer statement sent.",
		errorToast: "Unable to send customer statement.",
		onStarted() {
			setParams({
				statementStatus: "sending",
			});
		},
		onSuccess() {
			setParams({
				statementStatus: "sent",
			});
			reportQuery.refetch();
			detailQuery.refetch();
		},
		onError() {
			setParams({
				statementStatus: "overview",
			});
		},
	});
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
	const detail = detailQuery.data;
	const statementLines = detail?.lines || [];
	const selectedLineSet = useMemo(
		() => new Set(selectedSalesIds),
		[selectedSalesIds],
	);
	const selectedLines = useMemo(
		() => statementLines.filter((line) => selectedLineSet.has(line.salesId)),
		[statementLines, selectedLineSet],
	);
	const selectedTotal = selectedLines.reduce(
		(total, line) => total + Number(line.pending || 0),
		0,
	);
	const allLinesSelected =
		statementLines.length > 0 &&
		selectedSalesIds.length === statementLines.length;
	const hasPartialSelection =
		selectedSalesIds.length > 0 &&
		selectedSalesIds.length < statementLines.length;

	useEffect(() => {
		if (!open || !selectedCustomerId || !statementLines.length) return;
		setSelectedSalesIds(statementLines.map((line) => line.salesId));
	}, [open, selectedCustomerId, statementLines]);

	useEffect(() => {
		if (!open || statementStatus !== "sent") return;

		if (sentReturnTimeoutRef.current) {
			window.clearTimeout(sentReturnTimeoutRef.current);
		}
		sentReturnTimeoutRef.current = window.setTimeout(() => {
			setParams({
				statementCustomerId: null,
				statementStatus: null,
			});
		}, 1500);

		return () => {
			if (sentReturnTimeoutRef.current) {
				window.clearTimeout(sentReturnTimeoutRef.current);
				sentReturnTimeoutRef.current = null;
			}
		};
	}, [open, setParams, statementStatus]);

	const openCustomerStatement = (customerId: number | null) => {
		if (!customerId) return;
		setParams({
			report: "customer-statements",
			statementCustomerId: customerId,
			statementStatus: "overview",
		});
	};

	const backToList = () => {
		setParams({
			statementCustomerId: null,
			statementStatus: null,
		});
	};

	const toggleAllLines = (checked: boolean) => {
		setSelectedSalesIds(
			checked ? statementLines.map((line) => line.salesId) : [],
		);
	};

	const toggleLine = (salesId: number, checked: boolean) => {
		setSelectedSalesIds((current) =>
			checked
				? Array.from(new Set([...current, salesId]))
				: current.filter((id) => id !== salesId),
		);
	};

	const sendStatement = () => {
		if (!detail?.customer.email || !selectedLines.length) return;

		const customerName = detail.customer.displayName || "Customer";
		statementTrigger.customerStatement({
			customerId: detail.customer.id,
			accountNo: detail.customer.accountNo,
			customerEmail: detail.customer.email,
			customerName,
			statementTotal: selectedTotal,
			message: `Good Morning ${customerName.split(" ")[0] || customerName}, please see below Statement for the account.`,
			lines: selectedLines,
		});
	};

	const downloadStatementPdf = async () => {
		if (
			isDownloadingStatementPdf ||
			statementTrigger.isActionPending ||
			!detail?.customer.id ||
			!selectedSalesIds.length
		) {
			return;
		}
		setIsDownloadingStatementPdf(true);
		const downloadToast = toast.loading("Preparing PDF...", {
			description: "Generating the latest customer statement.",
		});

		try {
			await downloadCustomerStatementPdf({
				customerId: detail.customer.id,
				salesIds: selectedSalesIds,
				includeSalesInvoicesInPdf,
				templateId: "template-1",
			});
			toast.success("PDF downloaded", {
				id: downloadToast,
				description: "The customer statement is ready in your downloads.",
			});
		} catch (error) {
			toast.error("Unable to download statement PDF.", {
				id: downloadToast,
				description:
					error instanceof Error ? error.message : "Please try again.",
			});
		} finally {
			setIsDownloadingStatementPdf(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[min(88vh,760px)] max-w-[min(96vw,1040px)] flex-col overflow-hidden p-0">
				<DialogHeader className="shrink-0 border-b bg-muted/20 px-5 py-4">
					<div className="flex items-start justify-between gap-4">
						<div className="flex min-w-0 items-start gap-3">
							{activeTab === "statement-overview" ? (
								<Button
									aria-label="Back to customer statements"
									className="size-10 shrink-0 rounded-md"
									onClick={backToList}
									size="icon"
									variant="outline"
								>
									<Icons.ChevronLeft className="size-5" />
								</Button>
							) : (
								<div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
									<Icons.FileText className="size-5" />
								</div>
							)}
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<DialogTitle className="text-base">
										{activeTab === "statement-overview"
											? "Statement overview"
											: "Customer Statements"}
									</DialogTitle>
									<Badge variant="outline">
										{activeTab === "statement-overview" ? "Review" : "Reports"}
									</Badge>
								</div>
								<DialogDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
									{activeTab === "statement-overview" ? (
										<>
											<span>
												{detail?.customer.displayName
													? `${detail.customer.displayName} account statement`
													: "Loading customer statement..."}
											</span>
											{detail?.customer.email ? (
												<span>{detail.customer.email}</span>
											) : null}
											{detail?.customer.phoneNo ? (
												<span>{detail.customer.phoneNo}</span>
											) : null}
											{detail?.customer.accountNo ? (
												<Badge variant="outline">
													{detail.customer.accountNo}
												</Badge>
											) : null}
										</>
									) : (
										<span>Customers with outstanding order balances.</span>
									)}
								</DialogDescription>
							</div>
						</div>
						<div className="hidden shrink-0 text-right sm:block">
							<div className="text-xs text-muted-foreground">
								{activeTab === "statement-overview"
									? `${selectedLines.length} selected`
									: `${filteredCustomers.length} customers`}
							</div>
							<div className="text-lg font-semibold">
								{formatCurrency(
									activeTab === "statement-overview"
										? selectedTotal
										: filteredDueAmount,
								)}
							</div>
						</div>
					</div>
				</DialogHeader>

				{activeTab === "statement-overview" ? (
					statementStatus === "sending" || statementStatus === "sent" ? (
						<StatementSendState status={statementStatus} />
					) : (
						<StatementOverview
							allLinesSelected={allLinesSelected}
							detail={detail}
							hasPartialSelection={hasPartialSelection}
							isPending={detailQuery.isPending}
							isDownloadingPdf={isDownloadingStatementPdf}
							isSending={statementTrigger.isActionPending}
							includeSalesInvoicesInPdf={includeSalesInvoicesInPdf}
							onDownloadPdf={downloadStatementPdf}
							onSend={sendStatement}
							onIncludeSalesInvoicesInPdfChange={setIncludeSalesInvoicesInPdf}
							selectedLineSet={selectedLineSet}
							selectedLinesCount={selectedLines.length}
							selectedTotal={selectedTotal}
							toggleAllLines={toggleAllLines}
							toggleLine={toggleLine}
						/>
					)
				) : (
					<div className="flex min-h-0 flex-1 flex-col gap-4 px-5 py-4">
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

						<CustomerStatementReportDataTable
							className="min-h-0 flex-1"
							data={filteredCustomers}
							emptyDescription={
								search.trim()
									? "No customer statements match your search."
									: "No customer statements due."
							}
							footerDueAmount={formatCurrency(filteredDueAmount)}
							footerDueOrders={filteredDueOrders}
							isLoading={reportQuery.isPending}
							onOpenCustomer={openCustomerStatement}
						/>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

function StatementOverview({
	allLinesSelected,
	detail,
	hasPartialSelection,
	includeSalesInvoicesInPdf,
	isPending,
	isDownloadingPdf,
	isSending,
	onDownloadPdf,
	onIncludeSalesInvoicesInPdfChange,
	onSend,
	selectedLineSet,
	selectedLinesCount,
	selectedTotal,
	toggleAllLines,
	toggleLine,
}: {
	allLinesSelected: boolean;
	detail: CustomerStatementDetail | undefined;
	hasPartialSelection: boolean;
	includeSalesInvoicesInPdf: boolean;
	isPending: boolean;
	isDownloadingPdf: boolean;
	isSending: boolean;
	onDownloadPdf: () => void;
	onIncludeSalesInvoicesInPdfChange: (checked: boolean) => void;
	onSend: () => void;
	selectedLineSet: Set<number>;
	selectedLinesCount: number;
	selectedTotal: number;
	toggleAllLines: (checked: boolean) => void;
	toggleLine: (salesId: number, checked: boolean) => void;
}) {
	const customer = detail?.customer;
	const lines = detail?.lines || [];

	return (
		<>
			<div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-4">
				{isPending ? (
					<div className="space-y-4">
						<Skeleton className="h-24 w-full rounded-md" />
						<Skeleton className="h-56 w-full rounded-md" />
					</div>
				) : detail ? (
					<>
						{!customer?.email && customer?.id ? (
							<UpdateCustomerEmailForm customerId={customer.id} />
						) : null}
						<div className="grid gap-3 rounded-md border bg-muted/20 p-4 md:grid-cols-[1fr_auto]">
							<div>
								<div className="text-xs uppercase text-muted-foreground">
									Customer
								</div>
								<div className="mt-1 text-xl font-semibold">
									{customer?.displayName}
								</div>
								<div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
									{customer?.email ? <span>{customer.email}</span> : null}
									{customer?.phoneNo ? <span>{customer.phoneNo}</span> : null}
									{customer?.accountNo ? (
										<Badge variant="outline">{customer.accountNo}</Badge>
									) : null}
								</div>
								{customer?.address ? (
									<div className="mt-2 text-sm text-muted-foreground">
										{customer.address}
									</div>
								) : null}
							</div>
							<div className="grid gap-2 text-right">
								<div>
									<div className="text-xs text-muted-foreground">Total due</div>
									<div className="text-2xl font-semibold">
										{formatCurrency(detail.statementTotal)}
									</div>
								</div>
								<div className="text-xs text-muted-foreground">
									Last sent: {formatNullableDate(customer?.lastSentAt)}
								</div>
							</div>
						</div>

						<CustomerStatementLinesDataTable
							allLinesSelected={allLinesSelected}
							data={lines}
							hasPartialSelection={hasPartialSelection}
							selectedLineSet={selectedLineSet}
							toggleAllLines={toggleAllLines}
							toggleLine={toggleLine}
						/>
					</>
				) : (
					<div className="rounded-md border p-8 text-center text-muted-foreground">
						Unable to load this customer statement.
					</div>
				)}
			</div>

			<DialogFooter className="shrink-0 items-center justify-between border-t px-5 py-4 sm:justify-between">
				<div>
					<div className="text-xs text-muted-foreground">
						{selectedLinesCount} selected order
						{selectedLinesCount === 1 ? "" : "s"}
					</div>
					<div className="text-lg font-semibold">
						{formatCurrency(selectedTotal)}
					</div>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-3">
					<div className="flex items-center gap-2">
						<Checkbox
							id="include-sales-invoices-in-pdf"
							checked={includeSalesInvoicesInPdf}
							className="size-4 rounded-[4px] border-input shadow-xs transition-shadow outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:border-primary"
							disabled={isDownloadingPdf || isSending || isPending}
							onCheckedChange={(checked) =>
								onIncludeSalesInvoicesInPdfChange(checked === true)
							}
						/>
						<Label
							htmlFor="include-sales-invoices-in-pdf"
							className="cursor-pointer text-sm font-normal text-muted-foreground"
						>
							Include sales invoices in PDF
						</Label>
					</div>
					<Button
						disabled={
							isDownloadingPdf ||
							isSending ||
							isPending ||
							selectedLinesCount === 0 ||
							selectedTotal <= 0
						}
						onClick={onDownloadPdf}
						variant="outline"
					>
						{isDownloadingPdf ? (
							<>
								<Icons.Loader2 className="mr-2 size-4 animate-spin" />
								Preparing PDF
							</>
						) : (
							<>
								<Icons.FileText className="mr-2 size-4" />
								PDF
							</>
						)}
					</Button>
					<Button
						disabled={
							isSending ||
							isDownloadingPdf ||
							isPending ||
							!customer?.email ||
							selectedLinesCount === 0 ||
							selectedTotal <= 0
						}
						onClick={onSend}
					>
						{isSending ? (
							<>
								<Icons.Loader2 className="mr-2 size-4 animate-spin" />
								Sending
							</>
						) : (
							<>
								<Icons.Send className="mr-2 size-4" />
								Send statement
							</>
						)}
					</Button>
				</div>
			</DialogFooter>
		</>
	);
}

function StatementSendState({ status }: { status: string | null }) {
	const isSent = status === "sent";

	return (
		<div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
			<div
				className={cn(
					"mb-5 flex size-16 items-center justify-center rounded-full border",
					isSent
						? "border-emerald-200 bg-emerald-50 text-emerald-700"
						: "border-sky-200 bg-sky-50 text-sky-700",
				)}
			>
				{isSent ? (
					<Icons.CheckCircle2 className="size-8" />
				) : (
					<Icons.Loader2 className="size-8 animate-spin" />
				)}
			</div>
			<div className="text-xl font-semibold">
				{isSent ? "Statement sent" : "Sending statement"}
			</div>
			<p className="mt-2 max-w-sm text-sm text-muted-foreground">
				{isSent
					? "The customer statement email is on its way. Returning to the statement list."
					: "Preparing the selected orders and secure payment link for this customer."}
			</p>
		</div>
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

function formatNullableDate(value?: string | null) {
	if (!value) return "Never";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Never";

	return Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

const updateEmailSchema = z.object({
	email: z.string().email("Please enter a valid email address."),
});
type UpdateEmailFormValues = z.infer<typeof updateEmailSchema>;
const updateEmailResolver = zodResolver(
	updateEmailSchema as never,
) as Resolver<UpdateEmailFormValues>;

function UpdateCustomerEmailForm({
	customerId,
}: {
	customerId: number;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const form = useForm<UpdateEmailFormValues>({
		resolver: updateEmailResolver,
		defaultValues: { email: "" },
	});

	const updateMutation = useMutation(
		trpc.customers.updateCustomerEmail.mutationOptions({
			onSuccess: () => {
				toast.success("Email address updated successfully.");
				queryClient.invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update email address.");
			},
		}),
	);

	const onSubmit = form.handleSubmit((data) => {
		updateMutation.mutate({ customerId, email: data.email });
	});

	return (
		<Form {...form}>
			<form
				onSubmit={onSubmit}
				className="mb-4 flex items-start gap-4 rounded-md border border-amber-200 bg-amber-50 p-4"
			>
				<div className="flex-1">
					<div className="mb-2 text-sm font-medium text-amber-800">
						Customer email is missing. Please provide one to send the statement.
					</div>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input
										placeholder="Enter customer email address..."
										className="bg-white"
										disabled={updateMutation.isPending}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<Button
					type="submit"
					className="mt-[28px]"
					disabled={updateMutation.isPending}
				>
					{updateMutation.isPending ? (
						<Icons.Loader2 className="mr-2 size-4 animate-spin" />
					) : null}
					Save email
				</Button>
			</form>
		</Form>
	);
}
