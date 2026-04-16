"use client";

import { Icons } from "@gnd/ui/icons";

import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";

import { Badge } from "@gnd/ui/badge";

import { useSalesOverviewSystem } from "../../provider";
import {
	OverviewV2ActionLink,
	OverviewV2HeroCard,
	OverviewV2InfoCard,
	OverviewV2InfoRow,
	OverviewV2Metric,
	OverviewV2StatusCard,
} from "../../sections/overview/overview-v2-sections";
import { QuickActionsBar } from "../../sections/quick-actions-bar";
import type { SalesOverviewData } from "../../types";
import {
	formatAddress,
	formatCurrency,
	formatPercent,
	getPaymentBalance,
} from "../../view-model";

type AddressEntry = {
	title?: string | null;
	lines?: string[] | null;
	address?: string | null;
	street?: string | null;
	city?: string | null;
	state?: string | null;
	zipCode?: string | null;
	country?: string | null;
};

type CostLine = {
	id?: number | string | null;
	label?: string | null;
	title?: string | null;
	amount?: number | null;
	value?: number | null;
};

type OverviewTabData = {
	status?: {
		assignment?: { status?: string | null };
		production?: { status?: string | null };
		delivery?: { status?: string | null };
	};
	stats?: {
		prodAssigned?: {
			percentage?: number | null;
			score?: number | null;
			total?: number | null;
		};
		prodCompleted?: {
			percentage?: number | null;
			score?: number | null;
			total?: number | null;
		};
	};
	addressData?: {
		billing?: AddressEntry | null;
		shipping?: AddressEntry | null;
	};
	dispatchList?: Array<unknown> | null;
	costLines?: CostLine[] | null;
};

function getToneFromValue(
	value: number,
	thresholds: { high: number; medium: number },
): "emerald" | "amber" | "blue" | "violet" | "slate" {
	if (value >= thresholds.high) return "emerald";
	if (value >= thresholds.medium) return "blue";
	return "amber";
}

export function SalesOverviewOverviewTabV2() {
	const {
		state: { data, isQuote },
	} = useSalesOverviewSystem();
	const customerQuery = useCustomerOverviewQuery();
	const overviewData = data as
		| (SalesOverviewData & OverviewTabData)
		| null
		| undefined;

	const balance = getPaymentBalance(overviewData?.invoice);
	const paid = Number(overviewData?.invoice?.paid || 0);
	const total = Number(overviewData?.invoice?.total || 0);
	const paymentPct = total > 0 ? (paid / total) * 100 : 0;
	const assignedPct = Number(
		overviewData?.stats?.prodAssigned?.percentage || 0,
	);
	const completedPct = Number(
		overviewData?.stats?.prodCompleted?.percentage || 0,
	);
	const dispatchCount = overviewData?.dispatchList?.length || 0;
	const addressEntries = [
		overviewData?.addressData?.billing,
		overviewData?.addressData?.shipping,
	].filter(Boolean) as AddressEntry[];
	const costLines = (overviewData?.costLines ?? []) as CostLine[];
	const customerLabel = overviewData?.displayName || "Unknown customer";
	const paymentTone =
		balance <= 0 ? "emerald" : paymentPct >= 50 ? "blue" : "amber";
	const assignmentTone = getToneFromValue(assignedPct, {
		high: 100,
		medium: 50,
	});
	const productionTone = getToneFromValue(completedPct, {
		high: 100,
		medium: 50,
	});
	const deliveryTone =
		dispatchCount > 0 || overviewData?.status?.delivery?.status === "completed"
			? "blue"
			: "slate";

	return (
		<div className="space-y-4 p-1">
			<QuickActionsBar />

			<OverviewV2HeroCard>
				<div className="border-b border-slate-200/80 px-4 py-4 md:px-5">
					<div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)] xl:items-end">
						<div className="space-y-2.5">
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline" className="rounded-full px-2.5 py-0.5">
									{overviewData?.type || "Order"}
								</Badge>
								{overviewData?.orderId ? (
									<Badge
										variant="outline"
										className="rounded-full px-2.5 py-0.5"
									>
										#{overviewData.orderId}
									</Badge>
								) : null}
								{overviewData?.status?.delivery?.status ? (
									<Badge
										variant="outline"
										className="rounded-full px-2.5 py-0.5 capitalize"
									>
										{overviewData.status.delivery.status}
									</Badge>
								) : null}
							</div>
							<div>
								<p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
									Sales overview
								</p>
								<h2 className="text-xl font-semibold tracking-tight md:text-2xl">
									{customerLabel}
								</h2>
							</div>
							<div className="grid gap-1 text-sm text-muted-foreground md:grid-cols-2">
								<span>
									{overviewData?.customerPhone || "Phone not provided"}
								</span>
								<span>{overviewData?.email || "Email not provided"}</span>
								<span>
									{overviewData?.salesDate || "Sales date not recorded"}
								</span>
								<span>
									{overviewData?.deliveryOption || "Delivery not set"}
								</span>
							</div>
						</div>
						<div className="grid gap-2 sm:grid-cols-2">
							<OverviewV2Metric
								label={isQuote ? "Quoted Total" : "Invoice Total"}
								value={formatCurrency(total)}
								helper={
									isQuote
										? "Estimated customer-facing total"
										: "Current billed amount"
								}
								tone="slate"
							/>
							<OverviewV2Metric
								label={isQuote ? "Sales Rep" : "Balance Due"}
								value={
									isQuote
										? overviewData?.salesRep || "—"
										: formatCurrency(balance)
								}
								helper={
									isQuote
										? overviewData?.salesRepInitial
											? `Rep code ${overviewData.salesRepInitial}`
											: "Assigned rep"
										: balance <= 0
											? "Invoice fully covered"
											: `${formatPercent(paymentPct)} collected`
								}
								tone={isQuote ? "blue" : paymentTone}
							/>
						</div>
					</div>
				</div>
				{!isQuote ? (
					<div className="grid gap-2 px-4 py-3 md:grid-cols-2 md:px-5 xl:grid-cols-4">
						<OverviewV2Metric
							label="Collected"
							value={formatCurrency(paid)}
							helper={`${formatPercent(paymentPct)} payment progress`}
							tone="emerald"
						/>
						<OverviewV2Metric
							label="Assigned"
							value={formatPercent(assignedPct)}
							helper={`${overviewData?.stats?.prodAssigned?.score || 0}/${overviewData?.stats?.prodAssigned?.total || 0} items assigned`}
							tone={assignmentTone}
						/>
						<OverviewV2Metric
							label="Production"
							value={formatPercent(completedPct)}
							helper={`${overviewData?.stats?.prodCompleted?.score || 0}/${overviewData?.stats?.prodCompleted?.total || 0} items completed`}
							tone={productionTone}
						/>
						<OverviewV2Metric
							label="Dispatches"
							value={String(dispatchCount)}
							helper={
								dispatchCount
									? "Dispatch activity already started"
									: "No dispatch records yet"
							}
							tone={deliveryTone}
						/>
					</div>
				) : null}
			</OverviewV2HeroCard>

			{!isQuote ? (
				<div className="grid gap-3 xl:grid-cols-3">
					<OverviewV2StatusCard
						icon={Icons.CreditCard}
						label="Payment Health"
						status={balance <= 0 ? "settled" : "open"}
						statusTone={paymentTone}
						progressValue={paymentPct}
						progressColorClass={balance <= 0 ? "bg-emerald-500" : "bg-blue-500"}
						summary={`${formatCurrency(balance)} remaining`}
						detail={
							overviewData?.netTerm || overviewData?.dueDate
								? `Terms ${overviewData?.netTerm || "—"}${overviewData?.dueDate ? ` • Due ${overviewData.dueDate}` : ""}`
								: "No terms or due date recorded"
						}
					>
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
									{formatCurrency(Number(overviewData?.invoice?.pending || 0))}
								</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Balance</p>
								<p className="font-semibold">{formatCurrency(balance)}</p>
							</div>
						</div>
					</OverviewV2StatusCard>

					<OverviewV2StatusCard
						icon={Icons.Factory}
						label="Production Health"
						status={overviewData?.status?.production?.status || "not set"}
						statusTone={productionTone}
						progressValue={completedPct}
						progressColorClass={
							completedPct >= 100 ? "bg-emerald-500" : "bg-violet-500"
						}
						summary={`${overviewData?.stats?.prodCompleted?.score || 0}/${overviewData?.stats?.prodCompleted?.total || 0} items completed`}
						detail={`${overviewData?.stats?.prodAssigned?.score || 0}/${overviewData?.stats?.prodAssigned?.total || 0} items assigned`}
					>
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">Assignment</span>
							<span className="font-medium capitalize">
								{overviewData?.status?.assignment?.status || "—"}
							</span>
						</div>
					</OverviewV2StatusCard>

					<OverviewV2StatusCard
						icon={Icons.Truck}
						label="Delivery Health"
						status={overviewData?.status?.delivery?.status || "pending"}
						statusTone={deliveryTone}
						summary={
							dispatchCount
								? `${dispatchCount} dispatch ${dispatchCount === 1 ? "entry" : "entries"}`
								: "Dispatch has not started"
						}
						detail={
							overviewData?.deliveryOption || "Delivery option not recorded"
						}
					/>
				</div>
			) : null}

			<div className="grid gap-3 xl:grid-cols-[1.08fr_1.08fr_0.84fr]">
				<OverviewV2InfoCard
					icon={Icons.User}
					label="Customer"
					eyebrow={overviewData?.isBusiness ? "Business account" : undefined}
				>
					<OverviewV2InfoRow
						label="Name"
						action={
							overviewData?.accountNo ? (
								<OverviewV2ActionLink
									onClick={() => customerQuery.open(overviewData.accountNo)}
								>
									{customerLabel}
								</OverviewV2ActionLink>
							) : (
								customerLabel
							)
						}
					/>
					<OverviewV2InfoRow
						label="Phone"
						value={overviewData?.customerPhone}
					/>
					<OverviewV2InfoRow label="Email" value={overviewData?.email} />
					<OverviewV2InfoRow
						label="Account No"
						value={overviewData?.accountNo}
					/>
				</OverviewV2InfoCard>

				<OverviewV2InfoCard icon={Icons.Calendar} label="Order">
					<OverviewV2InfoRow
						label="Order #"
						action={
							overviewData?.orderId ? (
								<OverviewV2ActionLink
									onClick={() =>
										openLink(
											salesFormUrl(
												overviewData.type,
												overviewData.orderId,
												overviewData.isDyke,
											),
											{},
											true,
										)
									}
								>
									{overviewData.orderId}
								</OverviewV2ActionLink>
							) : undefined
						}
					/>
					<OverviewV2InfoRow label="P.O Number" value={overviewData?.poNo} />
					<OverviewV2InfoRow label="Type" value={overviewData?.type} />
					<OverviewV2InfoRow
						label="Sales Date"
						value={overviewData?.salesDate}
					/>
					<OverviewV2InfoRow
						label="Delivery"
						value={
							overviewData?.deliveryOption ||
							overviewData?.status?.delivery?.status
						}
					/>
				</OverviewV2InfoCard>
				<OverviewV2InfoCard
					icon={Icons.UserCheck}
					label="Sales Representative"
					eyebrow={overviewData?.salesRepInitial || undefined}
				>
					<div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-3">
						<div className="flex size-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold uppercase text-white">
							{overviewData?.salesRepInitial || "?"}
						</div>
						<div>
							<p className="text-sm font-semibold">
								{overviewData?.salesRep || "—"}
							</p>
							<p className="text-xs text-muted-foreground">
								Primary owner for this sale
							</p>
						</div>
					</div>
					<OverviewV2InfoRow label="Rep Name" value={overviewData?.salesRep} />
					<OverviewV2InfoRow label="P.O Number" value={overviewData?.poNo} />
				</OverviewV2InfoCard>
			</div>

			<div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
				{addressEntries.length > 0 ? (
					<OverviewV2InfoCard icon={Icons.MapPin} label="Addresses">
						<div className="grid gap-2 md:grid-cols-2">
							{addressEntries.map((addr, index) => (
								<div
									key={`${addr.title ?? "address"}-${addr.address ?? index}`}
									className="rounded-xl border border-border/50 bg-muted/15 p-3"
								>
									<p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
										{addr.title || (index === 0 ? "Billing" : "Shipping")}
									</p>
									<p className="mt-2 text-sm leading-5 text-foreground/85">
										{formatAddress(addr) || "—"}
									</p>
								</div>
							))}
						</div>
					</OverviewV2InfoCard>
				) : (
					<div />
				)}

				{!isQuote && costLines.length ? (
					<OverviewV2InfoCard
						icon={Icons.Package}
						label="Invoice Breakdown"
						eyebrow={`${costLines.length} lines`}
					>
						<div className="grid gap-2 sm:grid-cols-2">
							{costLines.map((line, index) => (
								<div
									key={String(
										line.id ??
											`${line.label ?? line.title ?? "line"}-${line.amount ?? line.value ?? index}`,
									)}
									className="rounded-xl border border-border/50 bg-white/70 p-3"
								>
									<p className="text-[11px] text-muted-foreground">
										{line.label || line.title || `Line ${index + 1}`}
									</p>
									<p className="mt-1 text-base font-semibold tracking-tight">
										{formatCurrency(Number(line.amount || line.value || 0))}
									</p>
								</div>
							))}
						</div>
					</OverviewV2InfoCard>
				) : null}
			</div>
		</div>
	);
}
