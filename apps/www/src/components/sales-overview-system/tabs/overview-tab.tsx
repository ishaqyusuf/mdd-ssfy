"use client";

import {
	Building2,
	Calendar,
	CreditCard,
	Factory,
	Mail,
	MapPin,
	Package,
	Phone,
	Truck,
	User,
	UserCheck,
} from "lucide-react";

import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";

import { useSalesOverviewSystem } from "../provider";
import { QuickActionsBar } from "../sections/quick-actions-bar";
import {
	formatAddress,
	formatCurrency,
	formatPercent,
	getPaymentBalance,
	getProgressValue,
} from "../view-model";

function StatPill({
	label,
	value,
	accent,
}: {
	label: string;
	value: string;
	accent?: "green" | "amber" | "blue" | "rose" | "slate";
}) {
	const accentMap: Record<string, string> = {
		green: "border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20",
		amber: "border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20",
		blue: "border-l-blue-500 bg-blue-50/60 dark:bg-blue-950/20",
		rose: "border-l-rose-500 bg-rose-50/60 dark:bg-rose-950/20",
		slate: "border-l-slate-400 bg-slate-50/60 dark:bg-slate-900/30",
	};
	return (
		<div
			className={cn(
				"rounded-lg border-l-2 px-4 py-3",
				accentMap[accent ?? "slate"],
			)}
		>
			<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-lg font-bold leading-none">{value}</p>
		</div>
	);
}

function SectionLabel({
	icon: Icon,
	label,
}: {
	icon: React.ElementType;
	label: string;
}) {
	return (
		<div className="flex items-center gap-2 pb-2">
			<Icon className="size-3.5 text-muted-foreground" />
			<span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
				{label}
			</span>
		</div>
	);
}

function DataRow({
	label,
	value,
	action,
}: {
	label: string;
	value?: string | null;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex items-start justify-between gap-3 border-b border-border/40 py-2.5 last:border-b-0">
			<p className="min-w-[110px] text-sm text-muted-foreground">{label}</p>
			<div className="flex items-center gap-2 text-right">
				{action ?? (
					<p className="text-sm font-medium">{value || "—"}</p>
				)}
			</div>
		</div>
	);
}

function ProgressBar({
	value,
	colorClass,
}: {
	value: number;
	colorClass: string;
}) {
	return (
		<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
			<div
				className={cn("h-full rounded-full transition-all", colorClass)}
				style={{ width: `${getProgressValue(value)}%` }}
			/>
		</div>
	);
}

function StatusDot({ color }: { color?: string | null }) {
	const colorMap: Record<string, string> = {
		green: "bg-emerald-500",
		amber: "bg-amber-500",
		yellow: "bg-amber-400",
		red: "bg-rose-500",
		blue: "bg-blue-500",
	};
	return (
		<span
			className={cn(
				"inline-block size-2 rounded-full",
				colorMap[color ?? ""] ?? "bg-slate-400",
			)}
		/>
	);
}

export function SalesOverviewOverviewTab() {
	const { data, isQuote } = useSalesOverviewSystem();
	const customerQuery = useCustomerOverviewQuery();

	const balance = getPaymentBalance(data?.invoice);
	const paid = Number(data?.invoice?.paid || 0);
	const total = Number(data?.invoice?.total || 0);
	const paymentPct = total > 0 ? (paid / total) * 100 : 0;
	const assignedPct = Number(data?.stats?.prodAssigned?.percentage || 0);
	const completedPct = Number(data?.stats?.prodCompleted?.percentage || 0);

	const addressEntries = [
		data?.addressData?.billing,
		data?.addressData?.shipping,
	].filter(Boolean);

	return (
		<div className="space-y-6 p-1">
			{/* Quick Actions */}
			<QuickActionsBar />

			{/* Hero stat strip */}
			{!isQuote && (
				<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
					<StatPill
						label="Invoice Total"
						value={formatCurrency(total)}
						accent="slate"
					/>
					<StatPill
						label="Balance Due"
						value={formatCurrency(balance)}
						accent={balance > 0 ? "amber" : "green"}
					/>
					<StatPill
						label="Assigned"
						value={formatPercent(assignedPct)}
						accent="blue"
					/>
					<StatPill
						label="Production"
						value={formatPercent(completedPct)}
						accent={completedPct >= 100 ? "green" : "slate"}
					/>
				</div>
			)}

			{/* Main grid */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Customer */}
				<div className="rounded-xl border bg-card p-4">
					<SectionLabel icon={User} label="Customer" />
					<DataRow
						label="Name"
						value={data?.displayName}
						action={
							data?.accountNo ? (
								<Button
									variant="ghost"
									size="xs"
									className="h-auto px-1 py-0 text-sm font-medium"
									onClick={() => customerQuery.open(data.accountNo)}
								>
									{data.displayName}
								</Button>
							) : undefined
						}
					/>
					<DataRow label="Phone" value={data?.customerPhone} />
					<DataRow label="Email" value={data?.email} />
					{data?.isBusiness && (
						<div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
							<Building2 className="size-3" />
							Business account
						</div>
					)}
				</div>

				{/* Order info */}
				<div className="rounded-xl border bg-card p-4">
					<SectionLabel icon={Calendar} label="Order" />
					<DataRow
						label="Order #"
						action={
							data?.orderId ? (
								<Button
									variant="ghost"
									size="xs"
									className="h-auto px-1 py-0 font-medium"
									onClick={() =>
										openLink(
											salesFormUrl(data.type, data.orderId, data.isDyke),
											{},
											true,
										)
									}
								>
									{data.orderId}
								</Button>
							) : undefined
						}
					/>
					<DataRow label="P.O Number" value={data?.poNo} />
					<DataRow label="Type" value={data?.type} />
					<DataRow label="Sales Date" value={data?.salesDate} />
					{!isQuote && (
						<DataRow
							label="Delivery"
							value={data?.deliveryOption || data?.status?.delivery?.status}
						/>
					)}
				</div>
			</div>

			{/* Sales rep */}
			<div className="rounded-xl border bg-card p-4">
				<SectionLabel icon={UserCheck} label="Sales Representative" />
				<div className="flex items-center gap-2">
					<div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase">
						{data?.salesRepInitial || "?"}
					</div>
					<div>
						<p className="text-sm font-semibold">{data?.salesRep || "—"}</p>
						{data?.salesRepInitial && (
							<p className="text-xs text-muted-foreground">
								{data.salesRepInitial}
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Payment status (non-quote) */}
			{!isQuote && (
				<div className="rounded-xl border bg-card p-4">
					<SectionLabel icon={CreditCard} label="Payment" />
					<div className="mb-3 space-y-1.5">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Payment progress</span>
							<span className="font-medium">{formatPercent(paymentPct)}</span>
						</div>
						<ProgressBar
							value={paymentPct}
							colorClass={
								paymentPct >= 100 ? "bg-emerald-500" : "bg-blue-500"
							}
						/>
					</div>
					<div className="grid grid-cols-3 gap-3 text-sm">
						<div>
							<p className="text-xs text-muted-foreground">Collected</p>
							<p className="font-semibold text-emerald-600">
								{formatCurrency(paid)}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Pending</p>
							<p className="font-semibold text-amber-600">
								{formatCurrency(Number(data?.invoice?.pending || 0))}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Balance</p>
							<p className="font-semibold">{formatCurrency(balance)}</p>
						</div>
					</div>
					{(data?.netTerm || data?.dueDate) && (
						<div className="mt-3 flex gap-4 border-t border-border/40 pt-3 text-sm">
							{data?.netTerm && (
								<div>
									<p className="text-xs text-muted-foreground">Terms</p>
									<p className="font-medium">{data.netTerm}</p>
								</div>
							)}
							{data?.dueDate && (
								<div>
									<p className="text-xs text-muted-foreground">Due</p>
									<p className="font-medium">{data.dueDate}</p>
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{/* Production status (non-quote) */}
			{!isQuote && (
				<div className="rounded-xl border bg-card p-4">
					<SectionLabel icon={Factory} label="Production" />
					{data?.stats?.prodAssigned?.total === 0 && data?.id ? (
						<p className="text-sm text-muted-foreground">
							Production not applicable for this sale.
						</p>
					) : (
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span>Assignment</span>
									<div className="flex items-center gap-1.5">
										<StatusDot color={data?.status?.assignment?.color} />
										<span className="text-xs font-medium capitalize">
											{data?.status?.assignment?.status || "—"}
										</span>
									</div>
								</div>
								<ProgressBar
									value={assignedPct}
									colorClass="bg-blue-500"
								/>
								<p className="text-xs text-muted-foreground">
									{data?.stats?.prodAssigned?.score}/
									{data?.stats?.prodAssigned?.total} assigned
								</p>
							</div>
							<div className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span>Completion</span>
									<div className="flex items-center gap-1.5">
										<StatusDot color={data?.status?.production?.color} />
										<span className="text-xs font-medium capitalize">
											{data?.status?.production?.status || "—"}
										</span>
									</div>
								</div>
								<ProgressBar
									value={completedPct}
									colorClass={
										completedPct >= 100 ? "bg-emerald-500" : "bg-violet-500"
									}
								/>
								<p className="text-xs text-muted-foreground">
									{data?.stats?.prodCompleted?.score}/
									{data?.stats?.prodCompleted?.total} completed
								</p>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Delivery status (non-quote) */}
			{!isQuote && (
				<div className="rounded-xl border bg-card p-4">
					<SectionLabel icon={Truck} label="Delivery" />
					<div className="flex items-center justify-between">
						<p className="text-sm text-muted-foreground">Status</p>
						<div className="flex items-center gap-1.5">
							<StatusDot color={data?.status?.delivery?.color} />
							<Badge
								variant="outline"
								className="capitalize"
							>
								{data?.status?.delivery?.status || "pending"}
							</Badge>
						</div>
					</div>
					<p className="mt-2 text-sm text-muted-foreground">
						{data?.dispatchList?.length
							? `${data.dispatchList.length} dispatch ${data.dispatchList.length === 1 ? "entry" : "entries"}`
							: "No dispatch entries yet"}
					</p>
				</div>
			)}

			{/* Addresses */}
			{addressEntries.length > 0 && (
				<div className="rounded-xl border bg-card p-4">
					<SectionLabel icon={MapPin} label="Addresses" />
					<div className="grid gap-4 md:grid-cols-2">
						{addressEntries.map((addr, i) => (
							<div key={i} className="space-y-1">
								<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
									{(addr as any)?.title ||
										(i === 0 ? "Billing" : "Shipping")}
								</p>
								<address className="not-italic text-sm leading-relaxed text-foreground/80">
									{(addr as any)?.lines?.filter(Boolean).map(
										(line: string, li: number) => (
											<span key={li}>
												{line}
												<br />
											</span>
										),
									) ||
										formatAddress(addr as Record<string, unknown>) ||
										"—"}
								</address>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Cost breakdown */}
			{!isQuote && data?.costLines?.length ? (
				<div className="rounded-xl border bg-card p-4">
					<SectionLabel icon={Package} label="Invoice Breakdown" />
					<div className="divide-y divide-border/40">
						{data.costLines.map((c, ci) => (
							<div
								key={ci}
								className="flex items-center justify-between py-2 text-sm"
							>
								<span className="text-muted-foreground">
									{(c as any)?.label || (c as any)?.title || `Line ${ci + 1}`}
								</span>
								<span className="font-medium">
									{formatCurrency(
										Number((c as any)?.amount || (c as any)?.value || 0),
									)}
								</span>
							</div>
						))}
					</div>
				</div>
			) : null}
		</div>
	);
}
