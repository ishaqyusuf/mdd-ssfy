"use client";

import type { ReactNode } from "react";

import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";

import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";

import { useSalesOverviewSystem } from "../../provider";
import { QuickActionsBar } from "../../sections/quick-actions-bar";
import type { SalesOverviewData } from "../../types";
import { formatAddress, formatCurrency } from "../../view-model";

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

type OverviewTabData = {
	status?: {
		assignment?: { status?: string | null };
		production?: { status?: string | null };
		delivery?: { status?: string | null };
	};
	addressData?: {
		shipping?: AddressEntry | null;
	};
};

function formatDateValue(value?: string | Date | null) {
	if (!value) return "—";
	if (value instanceof Date) return value.toLocaleDateString();
	return value;
}

function Section({
	title,
	children,
	className,
}: {
	title: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={cn("border-t border-border/70 pt-3", className)}>
			<h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
				{title}
			</h3>
			{children}
		</section>
	);
}

function Grid({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("grid gap-x-6 gap-y-1", className)}>{children}</div>
	);
}

function Row({
	label,
	value,
}: {
	label: string;
	value?: ReactNode;
}) {
	return (
		<div className="flex items-start justify-between gap-3 border-b border-border/40 py-1.5 last:border-b-0">
			<p className="text-sm text-muted-foreground">{label}</p>
			<div className="max-w-[65%] text-right text-sm font-medium leading-5">
				{value ?? "—"}
			</div>
		</div>
	);
}

function LinkValue({
	children,
	onClick,
}: {
	children: ReactNode;
	onClick: () => void;
}) {
	return (
		<Button
			variant="ghost"
			size="xs"
			className="h-auto px-0 py-0 text-sm font-medium"
			onClick={onClick}
		>
			{children}
		</Button>
	);
}

export function SalesOverviewOverviewTabV2() {
	const {
		state: { data },
	} = useSalesOverviewSystem();
	const customerQuery = useCustomerOverviewQuery();
	const overviewData = data as
		| (SalesOverviewData & OverviewTabData)
		| null
		| undefined;

	return (
		<div className="space-y-3 p-1">
			<QuickActionsBar />

			<Section title="Customer" className="border-t-0 pt-0">
				<Grid className="md:grid-cols-2">
					<div>
						<Row
							label="Name"
							value={
								overviewData?.accountNo ? (
									<LinkValue
										onClick={() => customerQuery.open(overviewData.accountNo)}
									>
										{overviewData?.displayName || "—"}
									</LinkValue>
								) : (
									overviewData?.displayName || "—"
								)
							}
						/>
						<Row label="Phone" value={overviewData?.customerPhone} />
					</div>
					<div>
						<Row label="Email" value={overviewData?.email} />
						<Row
							label="Type"
							value={overviewData?.isBusiness ? "Business" : "Regular"}
						/>
					</div>
				</Grid>
			</Section>

			<Section title="Payment">
				<Grid className="md:grid-cols-3">
					<Row
						label="Total"
						value={formatCurrency(Number(overviewData?.invoice?.total || 0))}
					/>
					<Row
						label="Paid"
						value={formatCurrency(Number(overviewData?.invoice?.paid || 0))}
					/>
					<Row
						label="Pending"
						value={formatCurrency(Number(overviewData?.invoice?.pending || 0))}
					/>
				</Grid>
			</Section>

			<Section title="Order Details">
				<Grid className="md:grid-cols-2">
					<div>
						<Row
							label="Order No"
							value={
								overviewData?.orderId ? (
									<LinkValue
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
									</LinkValue>
								) : (
									"—"
								)
							}
						/>
						<Row label="Type" value={overviewData?.type} />
						<Row label="Date" value={overviewData?.salesDate} />
					</div>
					<div>
						<Row label="Delivery Option" value={overviewData?.deliveryOption} />
						<Row
							label="Delivery Date"
							value={formatDateValue(
								overviewData?.dueDate || overviewData?.createdAt,
							)}
						/>
						<Row label="P.O No" value={overviewData?.poNo} />
					</div>
				</Grid>
			</Section>

			<Section title="Sales Rep">
				<Row label="Representative" value={overviewData?.salesRep} />
			</Section>

			<Section title="Shipping Address">
				<p className="text-sm leading-6 text-foreground/85">
					{formatAddress(overviewData?.addressData?.shipping) || "—"}
				</p>
			</Section>

			<Section title="Production Status">
				<Grid className="md:grid-cols-2">
					<Row
						label="Assignment"
						value={overviewData?.status?.assignment?.status || "—"}
					/>
					<Row
						label="Submission"
						value={overviewData?.status?.production?.status || "—"}
					/>
				</Grid>
			</Section>

			<Section title="Delivery Status">
				<Row
					label="Status"
					value={overviewData?.status?.delivery?.status || "—"}
				/>
			</Section>
		</div>
	);
}
