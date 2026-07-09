"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo, useState } from "react";

type EmailAttempt =
	RouterOutputs["emails"]["salesEmailAttempts"]["rows"][number];

const STATUSES = ["QUEUED", "SENDING", "SENT", "FAILED", "SKIPPED"] as const;

function toDate(value?: string | Date | null) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value?: string | Date | null) {
	const date = toDate(value);
	if (!date) return "Not set";
	return format(date, "MMM d, yyyy h:mm a");
}

function statusLabel(status: EmailAttempt["status"]) {
	switch (status) {
		case "QUEUED":
			return "Queued";
		case "SENDING":
			return "Sending";
		case "SENT":
			return "Sent";
		case "FAILED":
			return "Failed";
		case "SKIPPED":
			return "Skipped";
		default:
			return status;
	}
}

function statusClassName(status: EmailAttempt["status"]) {
	switch (status) {
		case "SENT":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		case "FAILED":
			return "border-rose-200 bg-rose-50 text-rose-700";
		case "SKIPPED":
			return "border-amber-200 bg-amber-50 text-amber-700";
		case "SENDING":
			return "border-sky-200 bg-sky-50 text-sky-700";
		default:
			return "border-muted bg-muted/40 text-muted-foreground";
	}
}

function emailKindLabel(attempt: EmailAttempt) {
	const doc = attempt.documentType === "quote" ? "Quote" : "Invoice";
	if (attempt.emailKind === "composed_sales_document_email") {
		return `Custom ${doc}`;
	}
	return doc;
}

function personLabel(
	person?: { name?: string | null; email?: string | null } | null,
) {
	return person?.name || person?.email || "Not assigned";
}

function sentStatusDate(attempt: EmailAttempt) {
	return (
		attempt.sentAt || attempt.failedAt || attempt.skippedAt || attempt.createdAt
	);
}

export function SalesEmailLedgerPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<"" | (typeof STATUSES)[number]>("");
	const [page, setPage] = useState(1);
	const size = 25;

	const listInput = useMemo(
		() => ({
			q: search.trim() || undefined,
			status: status || undefined,
			page,
			size,
		}),
		[page, search, status],
	);
	const attemptsQuery = useQuery(
		trpc.emails.salesEmailAttempts.queryOptions(listInput),
	);
	const attempts = attemptsQuery.data?.rows ?? [];
	const canResend = Boolean(attemptsQuery.data?.canResend);
	const total = attemptsQuery.data?.total ?? 0;
	const pageCount = attemptsQuery.data?.pageCount ?? 1;

	const refresh = async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.emails.salesEmailAttempts.pathKey(),
		});
	};

	const resendMutation = useMutation(
		trpc.emails.resendSalesEmailAttempt.mutationOptions({
			async onSuccess() {
				await refresh();
				toast({
					title: "Email resend queued",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to resend email",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	return (
		<div className="space-y-4 px-4 pb-8 md:px-8">
			<Card>
				<CardHeader className="gap-4">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div>
							<CardTitle>Email Transactions</CardTitle>
							<p className="mt-1 text-sm text-muted-foreground">
								{total.toLocaleString()} transaction{total === 1 ? "" : "s"}
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							onClick={() => void refresh()}
							disabled={attemptsQuery.isFetching}
						>
							{attemptsQuery.isFetching ? (
								<Icons.Loader2 className="mr-2 size-4 animate-spin" />
							) : (
								<Icons.RefreshCw className="mr-2 size-4" />
							)}
							Refresh
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-col gap-3 md:flex-row md:items-center">
						<div className="relative min-w-0 flex-1">
							<Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(event) => {
									setSearch(event.target.value);
									setPage(1);
								}}
								placeholder="Search recipient, customer, order, or subject"
								className="pl-9"
							/>
						</div>
						<select
							value={status}
							onChange={(event) => {
								setStatus(event.target.value as typeof status);
								setPage(1);
							}}
							className="h-10 rounded-md border bg-background px-3 text-sm"
							aria-label="Email status"
						>
							<option value="">All statuses</option>
							{STATUSES.map((item) => (
								<option key={item} value={item}>
									{statusLabel(item)}
								</option>
							))}
						</select>
					</div>

					<div className="overflow-hidden rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Status</TableHead>
									<TableHead>Recipient</TableHead>
									<TableHead>Sales</TableHead>
									<TableHead>Subject</TableHead>
									<TableHead>Rep</TableHead>
									<TableHead>Provider</TableHead>
									<TableHead className="w-[130px] text-right">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{attemptsQuery.isPending ? (
									<TableRow>
										<TableCell colSpan={7} className="h-24 text-center">
											<Icons.Loader2 className="mx-auto mb-2 size-4 animate-spin text-muted-foreground" />
											Loading emails...
										</TableCell>
									</TableRow>
								) : attempts.length ? (
									attempts.map((attempt) => (
										<TableRow key={attempt.id}>
											<TableCell>
												<div className="space-y-1.5">
													<Badge
														variant="outline"
														className={statusClassName(attempt.status)}
													>
														{statusLabel(attempt.status)}
													</Badge>
													<p className="text-xs text-muted-foreground">
														{formatDateTime(sentStatusDate(attempt))}
													</p>
												</div>
											</TableCell>
											<TableCell>
												<div className="max-w-[240px] space-y-1">
													<p className="truncate text-sm font-medium">
														{attempt.customerName || "Customer"}
													</p>
													<p className="truncate text-xs text-muted-foreground">
														{attempt.recipientEmail || "No email address"}
													</p>
												</div>
											</TableCell>
											<TableCell>
												<div className="space-y-1">
													<p className="text-sm font-medium">
														{emailKindLabel(attempt)}
													</p>
													<p className="max-w-[180px] truncate text-xs text-muted-foreground">
														{attempt.salesNos?.length
															? attempt.salesNos.join(", ")
															: "No sales reference"}
													</p>
												</div>
											</TableCell>
											<TableCell>
												<div className="max-w-[280px] space-y-1">
													<p className="truncate text-sm">
														{attempt.subject || "No subject"}
													</p>
													{attempt.errorMessage ? (
														<p className="truncate text-xs text-rose-600">
															{attempt.errorMessage}
														</p>
													) : null}
												</div>
											</TableCell>
											<TableCell>
												<div className="max-w-[200px] space-y-1">
													<p className="truncate text-sm">
														{personLabel(attempt.salesRep)}
													</p>
													<p className="truncate text-xs text-muted-foreground">
														By {personLabel(attempt.sender)}
													</p>
												</div>
											</TableCell>
											<TableCell>
												<div className="max-w-[180px] space-y-1">
													<p className="text-sm">
														{attempt.provider || "Provider"}
													</p>
													<p className="truncate text-xs text-muted-foreground">
														{attempt.providerMessageId ||
															attempt.providerStatus ||
															"Pending"}
													</p>
												</div>
											</TableCell>
											<TableCell className="text-right">
												{canResend && attempt.canResend ? (
													<Button
														type="button"
														size="sm"
														variant="outline"
														disabled={resendMutation.isPending}
														onClick={() =>
															resendMutation.mutate({
																attemptId: attempt.id,
															})
														}
													>
														{resendMutation.isPending ? (
															<Icons.Loader2 className="mr-2 size-4 animate-spin" />
														) : (
															<Icons.RotateCcw className="mr-2 size-4" />
														)}
														Resend
													</Button>
												) : (
													<span className="text-xs text-muted-foreground">
														-
													</span>
												)}
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={7} className="h-24 text-center">
											No email transactions found.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>

					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<p className="text-sm text-muted-foreground">
							Page {page} of {pageCount}
						</p>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={page <= 1 || attemptsQuery.isFetching}
								onClick={() => setPage((value) => Math.max(1, value - 1))}
							>
								Previous
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={page >= pageCount || attemptsQuery.isFetching}
								onClick={() =>
									setPage((value) => Math.min(pageCount, value + 1))
								}
							>
								Next
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
