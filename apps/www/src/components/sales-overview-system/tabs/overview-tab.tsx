"use client";

import { Fragment, useMemo, useState } from "react";

import Money from "@/components/_v1/money";
import { DataSkeleton } from "@/components/data-skeleton";
import { SearchInput } from "@/components/search-input";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import {
	DataSkeletonProvider,
	type useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { openLink } from "@/lib/open-link";
import { middleTruncate } from "@/lib/truncate-middle";
import { formatDate } from "@/lib/use-day";
import { buildSalesInventoryPrintViewerUrl } from "@/modules/sales-print/application/inventory-print-request";
import { useTRPC } from "@/trpc/client";
import { salesFormUrl } from "@/utils/sales-utils";

import {
	InventoryInboundStatusBadge,
	SalesInboundStatusBadge,
	getSingleInventoryInboundId,
} from "@/components/sales-inbound-status-badge";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Progress } from "@gnd/ui/progress";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";

import { DeliveryOption } from "../../sheets/sales-overview-sheet/delivery-option";
import { SalesPO } from "../../sheets/sales-overview-sheet/inline-data-edit";
import { useSalesInventorySegmentQuery } from "../hooks/use-sales-inventory-segment-query";
import { getSalesOverviewDocumentStatus } from "../lib/document-status";
import { useSalesOverviewSystem } from "../provider";
import { QuickActionsBar } from "../sections/quick-actions-bar";

type AddressEntry = {
	title?: string | null;
	lines?: string[] | null;
};

type CostLine = {
	amount?: number | null;
	label?: string | null;
};

function getStatusColor(status?: string | null) {
	switch (status) {
		case "green":
			return "bg-green-500";
		case "amber":
		case "yellow":
			return "bg-amber-500";
		case "red":
			return "bg-red-500";
		case "blue":
			return "bg-blue-500";
		default:
			return "bg-slate-400";
	}
}

function getStatusVariant(
	status?: string | null,
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "completed":
			return "default";
		case "in-progress":
			return "secondary";
		case "pending":
			return "outline";
		case "cancelled":
			return "destructive";
		default:
			return "outline";
	}
}

function SectionTitle({
	icon: Icon,
	children,
}: {
	icon: React.ComponentType<{ className?: string }>;
	children: React.ReactNode;
}) {
	return (
		<h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
			<Icon className="h-4 w-4" />
			{children}
		</h3>
	);
}

function formatInventoryQty(value: number | null | undefined) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}

function formatInventoryReadiness(value: string | null | undefined) {
	return value ? value.replaceAll("_", " ") : "not synced";
}

function getInventoryReadinessTone(value: string | null | undefined) {
	switch (value) {
		case "fulfilled":
			return "border-blue-200 bg-blue-50 text-blue-700";
		case "ready_for_production":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		case "awaiting_inbound":
			return "border-amber-200 bg-amber-50 text-amber-700";
		case "allocation_review":
			return "border-violet-200 bg-violet-50 text-violet-700";
		default:
			return "border-slate-200 bg-slate-50 text-slate-700";
	}
}

function SalesInventoryHealthCard({
	salesOrderId,
}: { salesOrderId?: number | null }) {
	const trpc = useTRPC();
	const inventoryQuery = useQuery(
		trpc.inventories.salesInventoryOverview.queryOptions(
			{
				salesOrderId: Number(salesOrderId || 0),
			},
			{
				enabled: !!salesOrderId,
				staleTime: 60 * 1000,
				refetchOnWindowFocus: false,
			},
		),
	);
	const overview = inventoryQuery.data;
	const summary = overview?.summary;
	const requiredQty = Number(summary?.qtyRequired || 0);
	const allocatedQty = Number(summary?.qtyAllocated || 0);
	const allocationPercent =
		requiredQty > 0 ? Math.min(100, (allocatedQty / requiredQty) * 100) : 0;
	const printUrl = salesOrderId
		? buildSalesInventoryPrintViewerUrl({
				salesIds: [salesOrderId],
				mode: "production",
			})
		: null;

	return (
		<div>
			<SectionTitle icon={Icons.Package}>INVENTORY HEALTH</SectionTitle>
			<Card className="border-border/40">
				<CardContent className="space-y-4 p-4">
					<div className="flex items-center justify-between gap-3">
						<div>
							<DataSkeleton
								className="text-sm font-medium"
								placeholder="Inventory not synced"
							>
								<div className="text-sm font-medium">
									{summary?.componentCount
										? `${summary.componentCount} components synced`
										: inventoryQuery.isLoading
											? "Loading inventory health"
											: "Inventory not synced"}
								</div>
							</DataSkeleton>
							<p className="text-xs text-muted-foreground">
								{formatInventoryQty(summary?.requiredComponentCount)} required
								components across {formatInventoryQty(summary?.lineItemCount)}{" "}
								line items
							</p>
						</div>
						<Badge
							variant="outline"
							className={`capitalize ${getInventoryReadinessTone(summary?.readiness)}`}
						>
							{formatInventoryReadiness(summary?.readiness)}
						</Badge>
					</div>

					<div>
						<div className="mb-2 flex items-center justify-between text-sm">
							<span>Allocation Progress</span>
							<span className="font-medium">
								{allocationPercent.toFixed(0)}%
							</span>
						</div>
						<Progress value={allocationPercent} className="h-2" />
					</div>

					<div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
						<div className="rounded-md border p-3">
							<div className="text-xs uppercase text-muted-foreground">
								Required
							</div>
							<div className="font-semibold">
								{formatInventoryQty(summary?.qtyRequired)}
							</div>
						</div>
						<div className="rounded-md border p-3">
							<div className="text-xs uppercase text-muted-foreground">
								Allocated
							</div>
							<div className="font-semibold">
								{formatInventoryQty(summary?.qtyAllocated)}
							</div>
						</div>
						<div className="rounded-md border p-3">
							<div className="text-xs uppercase text-muted-foreground">
								Inbound
							</div>
							<div className="font-semibold">
								{formatInventoryQty(summary?.qtyInbound)}
							</div>
						</div>
						<div className="rounded-md border p-3">
							<div className="text-xs uppercase text-muted-foreground">
								Received
							</div>
							<div className="font-semibold">
								{formatInventoryQty(summary?.qtyReceived)}
							</div>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={!printUrl || !summary?.componentCount}
							onClick={() => {
								if (!printUrl) return;
								window.open(printUrl, "_blank", "noopener,noreferrer");
							}}
						>
							<Icons.FileText className="mr-2 size-4" />
							Print Inventory
						</Button>
						<Button asChild size="sm" variant="outline">
							<a href="/inventory/backorders">
								<Icons.ExternalLink className="mr-2 size-4" />
								Backorders
							</a>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function SalesRepTransferControl() {
	const {
		state: { data, auth, isQuote },
	} = useSalesOverviewSystem();
	const trpc = useTRPC();
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [selectedSalesRepId, setSelectedSalesRepId] = useState<number | null>(
		null,
	);
	const [reason, setReason] = useState("");
	const [isPasswordOpen, setIsPasswordOpen] = useState(false);
	const [password, setPassword] = useState("");
	const currentSalesRepId = data?.salesRepId ?? null;
	const currentUserId = Number(auth?.id || 0) || null;
	const canTransfer =
		!!data?.id &&
		!isQuote &&
		(!!auth?.can?.editOrders || currentSalesRepId === currentUserId);
	const salesRepsQuery = useQuery(
		trpc.sales.salesRepOptions.queryOptions(
			{ salesId: data?.id ?? undefined },
			{
				enabled: canTransfer && isOpen && !!data?.id,
				staleTime: 5 * 60 * 1000,
			},
		),
	);
	const resetTransferState = () => {
		setIsOpen(false);
		setIsPasswordOpen(false);
		setSearch("");
		setSelectedSalesRepId(null);
		setReason("");
		setPassword("");
	};
	const salesReps = salesRepsQuery.data ?? [];
	const filteredSalesReps = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) return salesReps.slice(0, 12);
		return salesReps
			.filter((rep) =>
				[rep.name, rep.email, ...rep.roles]
					.filter(
						(value): value is string =>
							typeof value === "string" && value.length > 0,
					)
					.some((value) => value.toLowerCase().includes(term)),
			)
			.slice(0, 12);
	}, [salesReps, search]);
	const selectedSalesRep = salesReps.find(
		(rep) => rep.id === selectedSalesRepId,
	);
	const transferMutation = useMutation(
		trpc.sales.transferSalesRep.mutationOptions({
			onSuccess: (result) => {
				if (result.changed) {
					toast({
						title: "Sales rep updated.",
						description: `${result.order.orderId} now belongs to ${result.salesRep.name}.`,
						variant: "success",
					});
				} else {
					toast({
						title: "Sales rep already assigned.",
						description: `${result.order.orderId} is already assigned to ${result.salesRep.name}.`,
					});
				}
				resetTransferState();
			},
			onError: (error) => {
				setPassword("");
				toast({
					title: "Unable to transfer sales rep.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	if (!canTransfer) return null;

	const isPending = transferMutation.isPending;
	const canSubmit =
		!!data?.id &&
		!!selectedSalesRep &&
		selectedSalesRep.id !== currentSalesRepId &&
		!isPending;

	if (!isOpen) {
		return (
			<Button
				type="button"
				size="sm"
				variant="outline"
				className="mt-3"
				onClick={() => setIsOpen(true)}
			>
				<Icons.UserPlus className="mr-2 size-4" />
				Change Rep
			</Button>
		);
	}

	return (
		<div className="mt-3 space-y-3 rounded-md border border-border/60 p-3">
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs font-medium uppercase text-muted-foreground">
					Transfer order to
				</p>
				<Button
					type="button"
					size="icon"
					variant="ghost"
					className="size-7"
					aria-label="Close sales rep transfer"
					onClick={() => {
						resetTransferState();
					}}
				>
					<Icons.X className="size-4" />
				</Button>
			</div>

			<SearchInput
				placeholder="Search sales reps"
				value={search}
				onChangeText={setSearch}
			/>

			<div className="max-h-56 overflow-y-auto rounded-md border border-border/60">
				{salesRepsQuery.isPending ? (
					<div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
						<Icons.Loader2 className="size-4 animate-spin" />
						Loading reps
					</div>
				) : filteredSalesReps.length ? (
					filteredSalesReps.map((rep) => {
						const isCurrent = rep.id === currentSalesRepId;
						const isSelected = rep.id === selectedSalesRepId;

						return (
							<button
								key={rep.id}
								type="button"
								disabled={isCurrent || isPending}
								className={cn(
									"flex w-full items-center gap-3 border-b border-border/40 px-3 py-2 text-left last:border-b-0 hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-70",
									isSelected ? "bg-muted" : null,
								)}
								onClick={() => setSelectedSalesRepId(rep.id)}
							>
								<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
									{rep.initials}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-medium">
										{rep.name}
									</span>
									{rep.email ? (
										<span className="block truncate text-xs text-muted-foreground">
											{rep.email}
										</span>
									) : null}
								</span>
								{isCurrent ? (
									<Badge variant="outline">Current</Badge>
								) : isSelected ? (
									<Icons.CheckCircle2 className="size-4 text-primary" />
								) : null}
							</button>
						);
					})
				) : (
					<div className="px-3 py-4 text-sm text-muted-foreground">
						No matching reps
					</div>
				)}
			</div>

			<textarea
				value={reason}
				maxLength={500}
				rows={2}
				placeholder="Optional note"
				className="min-h-16 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				onChange={(event) => setReason(event.target.value)}
			/>

			<div className="flex justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					disabled={isPending}
					onClick={() => {
						resetTransferState();
					}}
				>
					Cancel
				</Button>
				<Button
					type="button"
					size="sm"
					disabled={!canSubmit}
					onClick={() => {
						if (!data?.id || !selectedSalesRep) return;
						setIsPasswordOpen(true);
					}}
				>
					<Icons.UserCheck className="mr-2 size-4" />
					Transfer
				</Button>
			</div>

			<Dialog
				open={isPasswordOpen}
				onOpenChange={(open) => {
					if (isPending) return;
					setIsPasswordOpen(open);
					if (!open) setPassword("");
				}}
			>
				<DialogContent className="sm:max-w-md">
					<form
						className="space-y-4"
						onSubmit={(event) => {
							event.preventDefault();
							if (!data?.id || !selectedSalesRep || !password) return;
							transferMutation.mutate({
								salesId: data.id,
								salesRepId: selectedSalesRep.id,
								reason: reason.trim() || null,
								password,
							});
						}}
					>
						<DialogHeader>
							<DialogTitle>Confirm Sales Rep Transfer</DialogTitle>
							<DialogDescription>
								Enter your password to move {data?.orderId} to{" "}
								{selectedSalesRep?.name}.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-2">
							<label
								htmlFor="sales-rep-transfer-password"
								className="text-sm font-medium"
							>
								Password
							</label>
							<Input
								id="sales-rep-transfer-password"
								type="password"
								autoComplete="current-password"
								value={password}
								disabled={isPending}
								onChange={(event) => setPassword(event.target.value)}
							/>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="ghost"
								disabled={isPending}
								onClick={() => {
									setIsPasswordOpen(false);
									setPassword("");
								}}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={!canSubmit || !password || isPending}
							>
								{isPending ? (
									<Icons.Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<Icons.UserCheck className="mr-2 size-4" />
								)}
								Confirm Transfer
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export function SalesOverviewOverviewTab() {
	const {
		state: { data, isQuote },
		actions: { setCurrentTab },
	} = useSalesOverviewSystem();
	const { setInventorySegment } = useSalesInventorySegmentQuery();
	const customerQuery = useCustomerOverviewQuery();
	const skeletonContext = {
		loading: !data?.id,
	} as unknown as ReturnType<typeof useCreateDataSkeletonCtx>;

	const total = Number(data?.invoice?.total || 0);
	const paid = Number(data?.invoice?.paid || 0);
	const pending = Number(data?.invoice?.pending || 0);
	const paymentPercentage = total > 0 ? (paid / total) * 100 : 0;
	const balance = total - paid;
	const productionPercentage = data?.stats?.prodCompleted?.percentage;
	const assignmentPercentage = data?.stats?.prodAssigned?.percentage;
	const assignmentStatus = data?.status?.assignment?.status ?? "pending";
	const assignmentStatusColor = data?.status?.assignment?.color ?? "warmGray";
	const productionStatus = data?.status?.production?.status ?? "pending";
	const productionStatusColor = data?.status?.production?.color ?? "warmGray";
	const deliveryStatus = data?.status?.delivery?.status ?? "pending";
	const deliveryStatusColor = data?.status?.delivery?.color ?? "warmGray";
	const dispatchCount = data?.dispatchList?.length ?? 0;
	const customerEmail = data?.email;
	const addresses = [
		data?.addressData?.billing,
		data?.addressData?.shipping,
	] as Array<AddressEntry | null | undefined>;
	const costLines = (data?.costLines ?? []) as CostLine[];
	const documentStatus = getSalesOverviewDocumentStatus(data);
	const hasInventoryInbound =
		!!data?.inventoryInboundOwnership?.hasInventoryInbound;
	const selectedInventoryInboundId = getSingleInventoryInboundId(
		data?.inventoryInboundOwnership,
	);
	const openInventoryInbounds = () => {
		if (!hasInventoryInbound) return;
		setInventorySegment("inbounds", {
			inboundId: selectedInventoryInboundId,
		});
		setCurrentTab("inventory");
	};

	return (
		<DataSkeletonProvider value={skeletonContext}>
			<div className="relative mt-0 space-y-6 p-6">
				<QuickActionsBar />

				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div className="space-y-6">
						<div>
							<SectionTitle icon={Icons.User}>
								CUSTOMER INFORMATION
							</SectionTitle>
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<Icons.User className="mt-0.5 h-4 w-4 text-muted-foreground" />
									<div>
										<DataSkeleton
											className="text-lg font-medium"
											placeholder="Customer Name"
										>
											<Button
												variant="secondary"
												size="xs"
												onClick={() => {
													if (data?.accountNo) {
														customerQuery.open(data.accountNo);
													}
												}}
												className="flex items-center gap-1 text-lg font-medium"
											>
												<TextWithTooltip
													className="max-w-[150px]"
													text={data?.displayName}
												/>
												<Icons.ExternalLink className="ml-1 h-4 w-4" />
											</Button>
										</DataSkeleton>
										{data?.isBusiness ? (
											<DataSkeleton
												className="text-sm text-muted-foreground"
												placeholder="Business"
											>
												<div className="flex items-center gap-1 text-sm text-muted-foreground">
													<Icons.Building className="h-3 w-3" />
													<span>Business</span>
												</div>
											</DataSkeleton>
										) : null}
									</div>
								</div>

								<div className="flex items-start gap-2">
									<Icons.Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
									<DataSkeleton className="text-sm" placeholder="239-825-2782">
										<span>{data?.customerPhone}</span>
									</DataSkeleton>
								</div>

								{customerEmail ? (
									<div className="flex min-w-0 items-start gap-2">
										<Icons.Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
										<DataSkeleton
											className="min-w-0 text-sm"
											placeholder="customer@example.com"
										>
											<span
												className="block min-w-0 max-w-full overflow-hidden whitespace-nowrap"
												title={customerEmail}
											>
												{middleTruncate(customerEmail)}
											</span>
										</DataSkeleton>
									</div>
								) : null}
							</div>
						</div>

						<div>
							<SectionTitle icon={Icons.Calendar}>
								{isQuote ? "QUOTE DETAILS" : "ORDER DETAILS"}
							</SectionTitle>
							<div className="space-y-3">
								<div className="grid grid-cols-2 gap-2 text-sm">
									<div>
										<p className="text-muted-foreground">
											{isQuote ? "Quote Number" : "Order Number"}
										</p>
										<DataSkeleton className="font-medium" placeholder="03527PC">
											<Button
												variant="secondary"
												size="xs"
												onClick={() => {
													if (!data?.orderId) return;
													openLink(
														salesFormUrl(data.type, data.orderId, data.isDyke),
														{},
														true,
													);
												}}
												className="flex items-center gap-1 font-medium"
											>
												<TextWithTooltip
													className="max-w-[150px]"
													text={data?.orderId}
												/>
												<Icons.ExternalLink className="ml-1 h-4 w-4" />
											</Button>
										</DataSkeleton>
									</div>
									<div>
										<p className="text-muted-foreground">
											{documentStatus.labelText}
										</p>
										<DataSkeleton
											className="font-medium"
											placeholder={isQuote ? "Open" : "Awaiting production"}
										>
											<Badge
												variant="outline"
												className={documentStatus.className}
											>
												{documentStatus.label}
											</Badge>
										</DataSkeleton>
									</div>
									<div>
										<p className="text-muted-foreground">Type</p>
										<DataSkeleton className="font-medium" placeholder="Order">
											<p className="font-medium capitalize">
												{isQuote ? "Quote" : data?.type}
											</p>
										</DataSkeleton>
									</div>
									{isQuote ? null : (
										<div>
											<p className="text-muted-foreground">Inbound Status</p>
											<DataSkeleton
												className="font-medium"
												placeholder="PENDING ORDER"
											>
												{hasInventoryInbound ? (
													<InventoryInboundStatusBadge
														ownership={data?.inventoryInboundOwnership}
													/>
												) : (
													<SalesInboundStatusBadge
														status={data?.inboundStatus}
														emptyFallback="No status"
														title="Manual order status"
													/>
												)}
												{hasInventoryInbound ? (
													<Button
														type="button"
														size="sm"
														variant="ghost"
														className="mt-1 h-6 px-0 text-[11px] text-primary hover:bg-transparent hover:underline"
														onClick={openInventoryInbounds}
													>
														<Icons.ExternalLink className="mr-1 size-3" />
														Open inbounds
													</Button>
												) : null}
											</DataSkeleton>
										</div>
									)}
								</div>
								<div className="grid grid-cols-2 gap-2 text-sm">
									<div>
										<p className="text-muted-foreground">Date</p>
										<DataSkeleton
											className="font-medium"
											placeholder="04/04/25"
										>
											<p className="font-medium">{data?.salesDate}</p>
										</DataSkeleton>
									</div>
									{isQuote ? null : (
										<div>
											<p className="text-muted-foreground">Delivery Option</p>
											<DeliveryOption salesId={data?.id} />
										</div>
									)}
									<SalesPO salesId={data?.id} value={data?.poNo} />
								</div>
							</div>
						</div>

						<div>
							<SectionTitle icon={Icons.UserCheck}>
								SALES REPRESENTATIVE
							</SectionTitle>
							<DataSkeleton
								className="text-sm font-medium"
								placeholder="Pablo Cruz (PC)"
							>
								<p className="text-sm font-medium">
									{data?.salesRep || "Unassigned"}{" "}
									{data?.salesRepInitial ? `(${data.salesRepInitial})` : null}
								</p>
							</DataSkeleton>
							<SalesRepTransferControl />
						</div>
					</div>

					<div className="space-y-6">
						<div className={cn(!isQuote || "hidden")}>
							<SectionTitle icon={Icons.CreditCardIcon}>
								PAYMENT STATUS
							</SectionTitle>
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-sm">Payment Progress</span>
									<DataSkeleton
										className="text-sm font-medium"
										placeholder="0%"
									>
										<span className="text-sm font-medium">
											{paymentPercentage.toFixed(0)}%
										</span>
									</DataSkeleton>
								</div>
								<DataSkeleton className="h-2 w-full" placeholder="">
									<Progress value={paymentPercentage} className="h-2" />
								</DataSkeleton>
								<div className="grid grid-cols-2 gap-4 pt-2">
									<div className="flex items-center gap-2">
										<Icons.CheckCircle2 className="h-4 w-4 text-green-500" />
										<div>
											<p className="text-sm text-muted-foreground">Paid</p>
											<DataSkeleton
												className="text-sm font-medium"
												placeholder="$0.00"
											>
												<p className="text-sm font-medium">
													${paid.toFixed(2)}
												</p>
											</DataSkeleton>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Icons.Clock className="h-4 w-4 text-amber-500" />
										<div>
											<p className="text-sm text-muted-foreground">Pending</p>
											<DataSkeleton
												className="text-sm font-medium"
												placeholder="$3,217.63"
											>
												<p className="text-sm font-medium">
													${pending.toFixed(2)}
												</p>
											</DataSkeleton>
										</div>
									</div>
								</div>
								<div className="mt-2 grid grid-cols-2 gap-4 border-t border-border/40 pt-3">
									<div>
										<p className="text-sm text-muted-foreground">
											Payment Terms
										</p>
										<DataSkeleton
											className="text-sm font-medium"
											placeholder="NET10"
										>
											<p className="text-sm font-medium">{data?.netTerm}</p>
										</DataSkeleton>
									</div>
									<div>
										<p className="text-sm text-muted-foreground">Due Date</p>
										<DataSkeleton
											className="text-sm font-medium"
											placeholder="04/14/25"
										>
											<div className="text-sm font-medium">
												{formatDate(data?.dueDate)}
											</div>
										</DataSkeleton>
									</div>
								</div>
							</div>
						</div>

						{balance > 0 && !isQuote && data?.id ? (
							<SalesPaymentProcessor
								selectedIds={[data.id]}
								phoneNo={data.customerPhone}
								customerId={data.customerId}
							/>
						) : null}

						<div>
							<SectionTitle icon={Icons.FileText}>INVOICE DETAILS</SectionTitle>
							<Card className="border-border/40">
								<CardContent className="p-4">
									<div className="space-y-2">
										{costLines.map((line, index) => (
											<div
												key={`${line.label ?? "line"}-${index}`}
												className="flex justify-between text-sm"
											>
												<span className="text-muted-foreground">
													{line.label}
												</span>
												<DataSkeleton placeholder="$0.00">
													<span>
														<Money value={line.amount} />
													</span>
												</DataSkeleton>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>

				<div>
					<SectionTitle icon={Icons.MapPin}>ADDRESSES</SectionTitle>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						{addresses.map((address, index) => (
							<Card key={address?.title ?? index} className="border-border/40">
								<CardContent className="p-4">
									<h4 className="mb-2 font-medium">{address?.title}</h4>
									<DataSkeleton
										className="text-sm not-italic text-muted-foreground"
										placeholder="1713 LEE AVE"
									>
										<address className="text-sm not-italic text-muted-foreground">
											{address?.lines?.filter(Boolean).map((line) => (
												<Fragment key={line}>
													{line}
													<br />
												</Fragment>
											))}
										</address>
									</DataSkeleton>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				<div className={cn(!isQuote || "hidden")}>
					<SectionTitle icon={Icons.Factory}>PRODUCTION STATUS</SectionTitle>
					{data?.stats?.prodAssigned?.total === 0 && data?.id ? (
						<Card className="border-border/40">
							<CardContent className="p-4">
								<div className="flex items-center justify-center py-2">
									<p className="text-sm text-muted-foreground">
										Production not applicable for this sale
									</p>
								</div>
							</CardContent>
						</Card>
					) : (
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
							<Card className="border-border/40">
								<CardContent className="p-4">
									<div className="mb-3 flex items-center justify-between">
										<span className="text-sm">Assignment Progress</span>
										<div className="flex items-center gap-2">
											<div
												className={`h-2 w-2 rounded-full ${getStatusColor(
													assignmentStatusColor,
												)}`}
											/>
											<DataSkeleton
												className="text-xs font-medium"
												placeholder="Completed"
											>
												<span className="text-xs font-medium capitalize">
													{assignmentStatus}
												</span>
											</DataSkeleton>
										</div>
									</div>
									<DataSkeleton className="mb-3 h-2 w-full" placeholder="">
										<Progress
											value={assignmentPercentage}
											className="mb-3 h-2"
										/>
									</DataSkeleton>
									<DataSkeleton
										className="text-sm text-muted-foreground"
										placeholder="7/7 items assigned"
									>
										<p className="text-sm text-muted-foreground">
											{data?.stats?.prodAssigned?.score}/
											{data?.stats?.prodAssigned?.total} items assigned
										</p>
									</DataSkeleton>
								</CardContent>
							</Card>

							<Card className="border-border/40">
								<CardContent className="p-4">
									<div className="mb-3 flex items-center justify-between">
										<span className="text-sm">Production Progress</span>
										<div className="flex items-center gap-2">
											<div
												className={`h-2 w-2 rounded-full ${getStatusColor(
													productionStatusColor,
												)}`}
											/>
											<DataSkeleton
												className="text-xs font-medium"
												placeholder="Pending"
											>
												<span className="text-xs font-medium capitalize">
													{productionStatus}
												</span>
											</DataSkeleton>
										</div>
									</div>
									<DataSkeleton className="mb-3 h-2 w-full" placeholder="">
										<Progress
											value={productionPercentage}
											className="mb-3 h-2"
										/>
									</DataSkeleton>
									<DataSkeleton
										className="text-sm text-muted-foreground"
										placeholder="0/7 items completed"
									>
										<p className="text-sm text-muted-foreground">
											{data?.stats?.prodCompleted?.score}/
											{data?.stats?.prodCompleted?.total} items completed
										</p>
									</DataSkeleton>
								</CardContent>
							</Card>
						</div>
					)}
				</div>

				<div className={cn(!isQuote || "hidden")}>
					<SalesInventoryHealthCard salesOrderId={data?.id} />
				</div>

				<div className={cn(!isQuote || "hidden")}>
					<SectionTitle icon={Icons.Package}>SHIPPING STATUS</SectionTitle>
					<Card className="border-border/40">
						<CardContent className="p-4">
							<div className="mb-3 flex items-center justify-between">
								<span className="text-sm">Delivery Status</span>
								<div className="flex items-center gap-2">
									<div
										className={`h-2 w-2 rounded-full ${getStatusColor(
											deliveryStatusColor,
										)}`}
									/>
									<DataSkeleton
										className="text-xs font-medium"
										placeholder="Pending"
									>
										<Badge variant={getStatusVariant(deliveryStatus)}>
											<span className="capitalize">{deliveryStatus}</span>
										</Badge>
									</DataSkeleton>
								</div>
							</div>
							<DataSkeleton
								className="text-sm text-muted-foreground"
								placeholder="No dispatch information available"
							>
								<p className="text-sm text-muted-foreground">
									{dispatchCount > 0
										? `${dispatchCount} dispatch entries available`
										: "No dispatch information available"}
								</p>
							</DataSkeleton>
						</CardContent>
					</Card>
				</div>
			</div>
		</DataSkeletonProvider>
	);
}
