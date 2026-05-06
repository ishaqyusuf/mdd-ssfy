"use client";

import { Fragment } from "react";

import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import Money from "@/components/_v1/money";
import { DataSkeleton } from "@/components/data-skeleton";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import {
	DataSkeletonProvider,
	type useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";

import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { Progress } from "@gnd/ui/progress";

import { DeliveryOption } from "../../sheets/sales-overview-sheet/delivery-option";
import { SalesPO } from "../../sheets/sales-overview-sheet/inline-data-edit";
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

export function SalesOverviewOverviewTab() {
	const {
		state: { data, isQuote },
	} = useSalesOverviewSystem();
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
	const addresses = [
		data?.addressData?.billing,
		data?.addressData?.shipping,
	] as Array<AddressEntry | null | undefined>;
	const costLines = (data?.costLines ?? []) as CostLine[];

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

								{data?.email ? (
									<div className="flex items-start gap-2">
										<Icons.Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
										<DataSkeleton
											className="text-sm"
											placeholder="customer@example.com"
										>
											<span>{data.email}</span>
										</DataSkeleton>
									</div>
								) : null}
							</div>
						</div>

						<div>
							<SectionTitle icon={Icons.Calendar}>ORDER DETAILS</SectionTitle>
							<div className="space-y-3">
								<div className="grid grid-cols-2 gap-2 text-sm">
									<div>
										<p className="text-muted-foreground">Order Number</p>
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
										<p className="text-muted-foreground">Type</p>
										<DataSkeleton className="font-medium" placeholder="Order">
											<p className="font-medium capitalize">
												{isQuote ? "Quote" : data?.type}
											</p>
										</DataSkeleton>
									</div>
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
									{data?.salesRep}{" "}
									{data?.salesRepInitial ? `(${data.salesRepInitial})` : null}
								</p>
							</DataSkeleton>
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
												<TCell.Date>{data?.dueDate}</TCell.Date>
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
