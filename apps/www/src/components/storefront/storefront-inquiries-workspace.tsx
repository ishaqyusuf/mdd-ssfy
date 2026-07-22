"use client";

import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { Input } from "@gnd/ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowUpRight,
	BriefcaseBusiness,
	Clock3,
	FileText,
	Inbox,
	Link2,
	type LucideIcon,
	MessageSquareText,
	Paperclip,
	Search,
	UserRoundCheck,
} from "lucide-react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useState } from "react";

const statuses = [
	"NEW",
	"IN_REVIEW",
	"AWAITING_CUSTOMER",
	"QUOTE_CREATED",
	"RESPONDED",
	"CLOSED",
	"SPAM",
] as const;
type InquiryStatus = (typeof statuses)[number];
type OperationalInquiryStatus = Exclude<InquiryStatus, "QUOTE_CREATED">;
const editableStatuses = statuses.filter(
	(status): status is OperationalInquiryStatus => status !== "QUOTE_CREATED",
);
type OwnerFilter = "all" | "mine" | "unassigned";

const statusLabel: Record<InquiryStatus, string> = {
	NEW: "New",
	IN_REVIEW: "In review",
	AWAITING_CUSTOMER: "Waiting on customer",
	QUOTE_CREATED: "Quote created",
	RESPONDED: "Responded",
	CLOSED: "Closed",
	SPAM: "Spam",
};

const statusClass: Record<InquiryStatus, string> = {
	NEW: "bg-blue-100 text-blue-800",
	IN_REVIEW: "bg-amber-100 text-amber-900",
	AWAITING_CUSTOMER: "bg-violet-100 text-violet-800",
	QUOTE_CREATED: "bg-emerald-100 text-emerald-800",
	RESPONDED: "bg-cyan-100 text-cyan-800",
	CLOSED: "bg-slate-100 text-slate-700",
	SPAM: "bg-rose-100 text-rose-800",
};

const summaryCards: ReadonlyArray<{
	label: string;
	key: "new" | "inReview" | "awaitingCustomer" | "quoteCreated" | "unassigned";
	Icon: LucideIcon;
}> = [
	{ label: "New", key: "new", Icon: Inbox },
	{ label: "In review", key: "inReview", Icon: BriefcaseBusiness },
	{ label: "Waiting", key: "awaitingCustomer", Icon: Clock3 },
	{ label: "Quoted", key: "quoteCreated", Icon: FileText },
	{ label: "Unassigned", key: "unassigned", Icon: UserRoundCheck },
];

const formatter = new Intl.DateTimeFormat("en-US", {
	timeZone: "America/New_York",
	month: "short",
	day: "numeric",
	year: "numeric",
	hour: "numeric",
	minute: "2-digit",
});

function date(value?: string | null) {
	return value ? formatter.format(new Date(value)) : "—";
}

function projectBriefValue(
	brief: Record<string, unknown> | undefined,
	key: string,
) {
	const value = brief?.[key];
	return typeof value === "string" && value.trim() ? value : null;
}

export function StorefrontInquiriesWorkspace() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { params: customerParams, setParams: setCustomerParams } =
		useCreateCustomerParams();
	const [inquiryId, setInquiryId] = useQueryState("inquiryId", parseAsString);
	const [query, setQuery] = useQueryState("inquiryQuery", parseAsString);
	const [status, setStatus] = useQueryState("inquiryStatus", parseAsString);
	const [owner, setOwner] = useQueryState("inquiryOwner", parseAsString);
	const [note, setNote] = useState("");
	const [awaitingCreatedCustomer, setAwaitingCreatedCustomer] = useState(false);
	const statusFilter = statuses.includes(status as InquiryStatus)
		? (status as InquiryStatus)
		: undefined;
	const ownerFilter: OwnerFilter = ["mine", "unassigned"].includes(owner || "")
		? (owner as OwnerFilter)
		: "all";

	const summary = useQuery(
		trpc.storefrontAdmin.operations.inquirySummary.queryOptions(),
	);
	const inquiries = useQuery(
		trpc.storefrontAdmin.operations.inquiries.queryOptions({
			limit: 25,
			query: query || undefined,
			status: statusFilter,
			owner: ownerFilter,
		}),
	);
	const detail = useQuery(
		trpc.storefrontAdmin.operations.inquiryDetail.queryOptions(
			{ id: inquiryId || "" },
			{ enabled: Boolean(inquiryId) },
		),
	);
	const documents = useQuery(
		trpc.storefrontAdmin.operations.inquiryDocuments.queryOptions(
			{ id: inquiryId || "" },
			{ enabled: Boolean(inquiryId) },
		),
	);
	const activity = useQuery(
		trpc.storefrontAdmin.operations.inquiryActivity.queryOptions(
			{ id: inquiryId || "" },
			{ enabled: Boolean(inquiryId) },
		),
	);
	const assignees = useQuery(
		trpc.storefrontAdmin.operations.inquiryAssignees.queryOptions(),
	);

	async function refresh() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.operations.inquiries.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.operations.inquirySummary.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.operations.inquiryDetail.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.operations.inquiryActivity.queryKey(),
			}),
		]);
	}

	function mutationError(error: { message: string }) {
		toast({
			title: "Unable to update inquiry",
			description: error.message,
			variant: "destructive",
		});
	}

	const updateStatus = useMutation(
		trpc.storefrontAdmin.operations.updateInquiryStatus.mutationOptions({
			onSuccess: async () => {
				await refresh();
				toast({ title: "Status updated", variant: "success" });
			},
			onError: mutationError,
		}),
	);
	const assign = useMutation(
		trpc.storefrontAdmin.operations.assignInquiry.mutationOptions({
			onSuccess: async () => {
				await refresh();
				toast({ title: "Owner updated", variant: "success" });
			},
			onError: mutationError,
		}),
	);
	const addNote = useMutation(
		trpc.storefrontAdmin.operations.addInquiryNote.mutationOptions({
			onSuccess: async () => {
				setNote("");
				await refresh();
				toast({ title: "Internal note added", variant: "success" });
			},
			onError: mutationError,
		}),
	);
	const linkCustomer = useMutation(
		trpc.storefrontAdmin.operations.linkInquiryCustomer.mutationOptions({
			onSuccess: async () => {
				setAwaitingCreatedCustomer(false);
				void setCustomerParams({ payload: null, search: null });
				await refresh();
				toast({ title: "Customer linked", variant: "success" });
			},
			onError: mutationError,
		}),
	);
	const createQuote = useMutation(
		trpc.storefrontAdmin.operations.createInquiryQuote.mutationOptions({
			onSuccess: async () => {
				await refresh();
				toast({ title: "Draft quote created", variant: "success" });
			},
			onError: mutationError,
		}),
	);

	useEffect(() => {
		const customerId = customerParams.payload?.customerId;
		if (
			awaitingCreatedCustomer &&
			inquiryId &&
			customerId &&
			!linkCustomer.isPending
		) {
			linkCustomer.mutate({ id: inquiryId, customerId });
		}
	}, [
		awaitingCreatedCustomer,
		customerParams.payload?.customerId,
		inquiryId,
		linkCustomer,
	]);

	useEffect(() => {
		if (
			awaitingCreatedCustomer &&
			customerParams.customerForm !== true &&
			!customerParams.payload?.customerId
		) {
			setAwaitingCreatedCustomer(false);
		}
	}, [
		awaitingCreatedCustomer,
		customerParams.customerForm,
		customerParams.payload?.customerId,
	]);

	const busy =
		updateStatus.isPending ||
		assign.isPending ||
		linkCustomer.isPending ||
		createQuote.isPending;

	return (
		<div className="space-y-5">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Custom millwork inbox
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Review customer briefs, organize follow-up, and turn approved scope
					into one canonical Sales quote.
				</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
				{summaryCards.map(({ label, key, Icon }) => (
					<Card key={label} className="border-border/70 shadow-none">
						<CardContent className="flex items-center justify-between p-4">
							<div>
								<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									{label}
								</p>
								<p className="mt-1 text-2xl font-semibold">
									{summary.data?.[key] || 0}
								</p>
							</div>
							<Icon className="size-5 text-muted-foreground" />
						</CardContent>
					</Card>
				))}
			</div>

			<Card className="overflow-hidden shadow-none">
				<div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
					<div className="relative min-w-0 flex-1">
						<Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
						<Input
							aria-label="Search custom millwork inquiries"
							className="pl-9"
							placeholder="Search reference, name, email, or phone"
							value={query || ""}
							onChange={(event) => void setQuery(event.target.value || null)}
						/>
					</div>
					<select
						aria-label="Filter inquiries by status"
						className="h-9 rounded-md border bg-background px-3 text-sm"
						value={statusFilter || "ALL"}
						onChange={(event) =>
							void setStatus(
								event.target.value === "ALL" ? null : event.target.value,
							)
						}
					>
						<option value="ALL">All statuses</option>
						{statuses.map((value) => (
							<option key={value} value={value}>
								{statusLabel[value]}
							</option>
						))}
					</select>
					<select
						aria-label="Filter inquiries by owner"
						className="h-9 rounded-md border bg-background px-3 text-sm"
						value={ownerFilter}
						onChange={(event) =>
							void setOwner(
								event.target.value === "all" ? null : event.target.value,
							)
						}
					>
						<option value="all">All owners</option>
						<option value="mine">Assigned to me</option>
						<option value="unassigned">Unassigned</option>
					</select>
				</div>

				{inquiries.isPending ? (
					<div className="grid gap-3 p-4">
						{[0, 1, 2].map((item) => (
							<div
								key={item}
								className="h-20 animate-pulse rounded-lg bg-muted"
							/>
						))}
					</div>
				) : inquiries.error ? (
					<p className="p-6 text-sm text-destructive">
						{inquiries.error.message}
					</p>
				) : inquiries.data?.items.length ? (
					<div className="divide-y">
						{inquiries.data.items.map((inquiry) => (
							<button
								key={inquiry.id}
								type="button"
								className="grid w-full gap-3 p-4 text-left transition-colors hover:bg-muted/50 md:grid-cols-[145px_minmax(0,1fr)_180px_145px] md:items-center"
								onClick={() => void setInquiryId(inquiry.id)}
							>
								<div>
									<p className="font-mono text-xs font-semibold">
										{inquiry.reference || inquiry.id}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{date(inquiry.submittedAt || inquiry.createdAt)}
									</p>
								</div>
								<div className="min-w-0">
									<p className="truncate font-medium">{inquiry.name}</p>
									<p className="truncate text-sm text-muted-foreground">
										{inquiry.email}
									</p>
									{inquiry.projectTypes.length ? (
										<p className="mt-1 truncate text-xs text-muted-foreground">
											{inquiry.projectTypes.join(" · ")}
										</p>
									) : null}
								</div>
								<div className="text-sm">
									<p>
										{inquiry.assignee?.name ||
											inquiry.assignee?.email ||
											"Unassigned"}
									</p>
									{inquiry.salesQuoteId ? (
										<p className="mt-1 text-xs text-emerald-700">
											Linked quote
										</p>
									) : null}
								</div>
								<div className="md:text-right">
									<Badge className={statusClass[inquiry.status]}>
										{statusLabel[inquiry.status]}
									</Badge>
								</div>
							</button>
						))}
					</div>
				) : (
					<div className="p-12 text-center">
						<Inbox className="mx-auto size-8 text-muted-foreground" />
						<p className="mt-3 font-medium">
							No inquiries match these filters.
						</p>
						<p className="mt-1 text-sm text-muted-foreground">
							New customer requests will appear here after submission.
						</p>
					</div>
				)}
			</Card>

			<Sheet
				open={Boolean(inquiryId)}
				onOpenChange={(open) => {
					if (!open) {
						setAwaitingCreatedCustomer(false);
						void setInquiryId(null);
					}
				}}
			>
				<SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl">
					<SheetHeader className="border-b p-6">
						<SheetTitle className="flex items-center gap-3">
							<span className="font-mono text-base">
								{detail.data?.reference || "Project request"}
							</span>
							{detail.data ? (
								<Badge className={statusClass[detail.data.status]}>
									{statusLabel[detail.data.status]}
								</Badge>
							) : null}
						</SheetTitle>
						<SheetDescription>
							{detail.data
								? `${detail.data.name} · received ${date(detail.data.submittedAt || detail.data.createdAt)}`
								: "Loading customer brief…"}
						</SheetDescription>
					</SheetHeader>
					{detail.isPending ? (
						<div className="grid gap-3 p-6">
							<div className="h-24 animate-pulse rounded-lg bg-muted" />
							<div className="h-52 animate-pulse rounded-lg bg-muted" />
						</div>
					) : detail.error ? (
						<p className="p-6 text-sm text-destructive">
							{detail.error.message}
						</p>
					) : detail.data ? (
						<div className="space-y-6 p-6">
							<div className="grid gap-3 sm:grid-cols-2">
								<label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Status
									<select
										className="h-10 rounded-md border bg-background px-3 text-sm font-normal normal-case text-foreground"
										value={detail.data.status}
										disabled={busy}
										onChange={(event) =>
											updateStatus.mutate({
												id: detail.data.id,
												status: event.target.value as OperationalInquiryStatus,
											})
										}
									>
										{detail.data.status === "QUOTE_CREATED" ? (
											<option value="QUOTE_CREATED" disabled>
												{statusLabel.QUOTE_CREATED}
											</option>
										) : null}
										{editableStatuses.map((value) => (
											<option key={value} value={value}>
												{statusLabel[value]}
											</option>
										))}
									</select>
								</label>
								<label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Owner
									<select
										className="h-10 rounded-md border bg-background px-3 text-sm font-normal normal-case text-foreground"
										value={detail.data.assignedToId || ""}
										disabled={busy}
										onChange={(event) =>
											assign.mutate({
												id: detail.data.id,
												assignedToId: event.target.value
													? Number(event.target.value)
													: null,
											})
										}
									>
										<option value="">Unassigned</option>
										{assignees.data?.map((user) => (
											<option key={user.id} value={user.id}>
												{user.name || user.email}
											</option>
										))}
									</select>
								</label>
							</div>

							<section className="rounded-xl border p-4">
								<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Customer brief
								</p>
								<h3 className="mt-2 text-lg font-semibold">
									{detail.data.subject || "Custom millwork project"}
								</h3>
								<p className="mt-3 whitespace-pre-wrap text-sm leading-6">
									{detail.data.message}
								</p>
								<dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
									<div>
										<dt className="text-muted-foreground">Project types</dt>
										<dd className="mt-1">
											{detail.data.projectTypes.join(", ") || "Not specified"}
										</dd>
									</div>
									<div>
										<dt className="text-muted-foreground">Budget</dt>
										<dd className="mt-1">
											{detail.data.budget || "Not specified"}
										</dd>
									</div>
									<div>
										<dt className="text-muted-foreground">Location</dt>
										<dd className="mt-1">
											{[
												projectBriefValue(detail.data.projectBrief, "city"),
												projectBriefValue(detail.data.projectBrief, "state"),
												projectBriefValue(
													detail.data.projectBrief,
													"postalCode",
												),
											]
												.filter(Boolean)
												.join(", ") || "Not specified"}
										</dd>
									</div>
									<div>
										<dt className="text-muted-foreground">Target date</dt>
										<dd className="mt-1">
											{projectBriefValue(
												detail.data.projectBrief,
												"targetDate",
											) || "Flexible / not specified"}
										</dd>
									</div>
								</dl>
							</section>

							<section className="rounded-xl border p-4">
								<div className="flex items-center gap-2">
									<Paperclip className="size-4" />
									<h3 className="font-semibold">Private attachments</h3>
								</div>
								{documents.isPending ? (
									<p className="mt-3 text-sm text-muted-foreground">
										Loading files…
									</p>
								) : documents.data?.length ? (
									<div className="mt-3 grid gap-2">
										{documents.data.map((document) => (
											<Button
												key={document.id}
												asChild
												variant="outline"
												className="justify-start"
											>
												<a
													href={document.downloadUrl}
													target="_blank"
													rel="noreferrer"
												>
													<FileText className="mr-2 size-4" />
													<span className="truncate">{document.filename}</span>
													<ArrowUpRight className="ml-auto size-4" />
												</a>
											</Button>
										))}
									</div>
								) : (
									<p className="mt-3 text-sm text-muted-foreground">
										No files were attached.
									</p>
								)}
							</section>

							<section className="rounded-xl border p-4">
								<div className="flex items-center gap-2">
									<Link2 className="size-4" />
									<h3 className="font-semibold">Customer and quote</h3>
								</div>
								{detail.data.customer ? (
									<div className="mt-3 rounded-lg bg-muted p-3 text-sm">
										<p className="font-medium">
											{detail.data.customer.businessName ||
												detail.data.customer.name}
										</p>
										<p className="text-muted-foreground">
											{detail.data.customer.email ||
												detail.data.customer.phoneNo ||
												"Customer record"}
										</p>
									</div>
								) : (
									<div className="mt-3 space-y-3">
										<p className="text-sm text-muted-foreground">
											Link this request to the office customer record before
											creating a quote.
										</p>
										{detail.data.customerMatches.map((customer) => (
											<div
												key={customer.id}
												className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
											>
												<div>
													<p className="font-medium">
														{customer.businessName || customer.name}
													</p>
													<p className="text-muted-foreground">
														{customer.email || customer.phoneNo}
													</p>
												</div>
												<Button
													size="sm"
													variant="outline"
													disabled={busy}
													onClick={() =>
														linkCustomer.mutate({
															id: detail.data.id,
															customerId: customer.id,
														})
													}
												>
													Link
												</Button>
											</div>
										))}
										<Button
											variant="outline"
											onClick={() => {
												void setCustomerParams({
													customerForm: true,
													search: detail.data.name,
													payload: null,
												}).then(() => setAwaitingCreatedCustomer(true));
											}}
										>
											Create customer
										</Button>
									</div>
								)}
								{detail.data.quote ? (
									<Button asChild className="mt-4 w-full">
										<Link
											href={`/sales-form/edit-order/${detail.data.quote.slug}`}
										>
											Open quote {detail.data.quote.orderId}
											<ArrowUpRight className="ml-2 size-4" />
										</Link>
									</Button>
								) : (
									<Button
										className="mt-4 w-full"
										disabled={
											busy || !detail.data.customer || !detail.data.assignedToId
										}
										onClick={() => createQuote.mutate({ id: detail.data.id })}
									>
										Create draft Sales quote
									</Button>
								)}
							</section>

							<section className="rounded-xl border p-4">
								<div className="flex items-center gap-2">
									<MessageSquareText className="size-4" />
									<h3 className="font-semibold">Internal activity</h3>
								</div>
								<div className="mt-3 flex gap-2">
									<Textarea
										rows={2}
										placeholder="Add an internal note…"
										value={note}
										onChange={(event) => setNote(event.target.value)}
									/>
									<Button
										disabled={!note.trim() || addNote.isPending}
										onClick={() =>
											addNote.mutate({ id: detail.data.id, body: note })
										}
									>
										Add
									</Button>
								</div>
								{activity.isPending ? (
									<p className="mt-4 text-sm text-muted-foreground">
										Loading activity…
									</p>
								) : (
									<div className="mt-5 grid gap-4">
										{activity.data?.map((item) => (
											<div key={item.id} className="border-l-2 pl-3 text-sm">
												<div className="flex items-center justify-between gap-3">
													<p className="font-medium">
														{item.type.replaceAll(".", " ")}
													</p>
													<time className="text-xs text-muted-foreground">
														{date(item.createdAt)}
													</time>
												</div>
												{item.body ? (
													<p className="mt-1 whitespace-pre-wrap text-muted-foreground">
														{item.body}
													</p>
												) : null}
												<p className="mt-1 text-xs text-muted-foreground">
													{item.actor?.name || item.actor?.email || "System"}
												</p>
											</div>
										))}
									</div>
								)}
							</section>
						</div>
					) : null}
				</SheetContent>
			</Sheet>
		</div>
	);
}
