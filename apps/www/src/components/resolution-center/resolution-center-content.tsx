"use client";

import { salesResolveUpdatePaymentAction } from "@/actions/sales-resolve-update-payment";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { useResolutionCenterParams } from "@/hooks/use-resolution-center-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { generateRandomString } from "@/lib/utils";
import type { ColumnDef } from "@/types/type";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { CardHeader, CardTitle } from "@gnd/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { Icons } from "@gnd/ui/icons";
import { useAction } from "next-safe-action/hooks";
import { Menu } from "../(clean-code)/menu";
import { Progress } from "../(clean-code)/progress";
import Money from "../_v1/money";
import { SalesData } from "./sales-data";

export type Item =
	RouterOutputs["sales"]["getSalesResolutions"]["data"][number];

function hasDueMismatch(item: Item) {
	return Number(item.due || 0) !== Number(item.calculatedDue || 0);
}

function getRecommendedResolutionAction(item: Item) {
	if (item.status === "overpayment") {
		return "Review refund or wallet credit";
	}
	if (item.status === "duplicate payments") {
		return "Cancel duplicate payment and confirm the remaining valid charge";
	}
	if (hasDueMismatch(item)) {
		return "Sync the order due amount with the recorded payment state";
	}
	return "Monitor account";
}

export const columns: ColumnDef<Item>[] = [
	{
		header: "data",
		accessorKey: "data",
		meta: {
			className: "hover:bg-transparent p-0",
		},
		cell: ({ row: { original: item } }) => <Content item={item} />,
	},
];
function Content({ item: sale }: { item: Item }) {
	const { params, setParams } = useResolutionCenterParams();
	const ids = params?.resolutionIds || [];
	const dueMismatch = hasDueMismatch(sale);
	const recommendedAction = getRecommendedResolutionAction(sale);

	const salesOverview = useSalesOverviewQuery();
	const customerQuery = useCustomerOverviewQuery();
	return (
		<div className="min-w-0">
			<Collapsible
				open={ids.includes(sale.id)}
				onOpenChange={() => {
					let resolutionIds = [...ids];
					if (resolutionIds.includes(sale.id))
						resolutionIds = resolutionIds.filter((a) => a !== sale.id);
					else resolutionIds.push(sale.id);
					if (!resolutionIds.length) resolutionIds = null;
					setParams({
						resolutionIds,
					});
				}}
			>
				<CollapsibleTrigger asChild>
					<CardHeader className="cursor-pointer p-3 transition-colors hover:bg-muted/50 md:p-6">
						<div className="flex min-w-0 items-start justify-between gap-3 md:items-center">
							<div className="flex min-w-0 flex-1 items-start gap-2 md:gap-4">
								<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground md:size-auto md:border-0 md:bg-transparent">
									{ids.includes(sale.id) ? (
										<Icons.ChevronDown className="h-4 w-4 md:h-5 md:w-5" />
									) : (
										<Icons.ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
									)}
								</div>
								<div className="min-w-0 flex-1">
									<CardTitle className="hidden text-lg uppercase md:block">
										<Button
											size="xs"
											className="uppercase border-b border-muted hover:border-muted-foreground"
											variant="secondary"
											onClick={(e) => {
												e.preventDefault();
												salesOverview.open2(sale?.orderId, "sales");
											}}
										>
											Order #{sale.orderId}
										</Button>
										{" - "}
										<Button
											size="xs"
											disabled={!sale?.accountNo}
											onClick={(e) => {
												e.preventDefault();
												// if (sale?.accountNo)
												customerQuery.open(sale?.accountNo);
											}}
											className="uppercase border-b border-muted hover:border-muted-foreground"
											variant="secondary"
										>
											{sale?.customer?.businessName || sale?.customer?.name}
										</Button>
									</CardTitle>
									<div className="flex min-w-0 items-start justify-between gap-2 md:hidden">
										<div className="min-w-0">
											<div className="truncate text-sm font-semibold uppercase leading-5 text-foreground">
												{sale?.customer?.businessName ||
													sale?.customer?.name ||
													"Customer"}
											</div>
											<div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
												<span className="shrink-0 font-medium">
													#{sale.orderId}
												</span>
												<span className="text-muted-foreground/40">|</span>
												<span className="min-w-0 truncate">
													{sale.salesRep || "No rep"}
												</span>
											</div>
										</div>
										<div className="shrink-0 text-right">
											<div className="font-mono text-sm font-semibold tabular-nums text-foreground">
												<Money value={sale.total} />
											</div>
											<div className="mt-0.5 text-[10px] uppercase leading-3 text-muted-foreground">
												{sale.paymentCount} payment
												{sale.paymentCount !== 1 ? "s" : ""}
											</div>
										</div>
									</div>
									<div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 md:hidden">
										{sale.status ? (
											<Badge
												variant="outline"
												className="h-5 shrink-0 px-1.5 text-[10px] font-medium capitalize"
											>
												{sale.status}
											</Badge>
										) : null}
										{dueMismatch ? (
											<Badge
												variant="secondary"
												className="h-5 shrink-0 bg-amber-50 px-1.5 text-[10px] font-medium text-amber-700"
											>
												Due mismatch
											</Badge>
										) : null}
										<span className="min-w-0 truncate text-[11px] leading-4 text-muted-foreground">
											{sale.orderDate}
										</span>
									</div>
									<div className="mt-1 hidden items-center gap-4 text-sm text-muted-foreground md:flex">
										<div className="flex items-center gap-1">
											<Icons.User className="h-4 w-4" />
											{sale.salesRep}
										</div>
										<div className="flex items-center gap-1">
											<Icons.Calendar className="h-4 w-4" />
											{sale.orderDate}
										</div>
										<div className="flex items-center gap-1">
											<Icons.DollarSign className="h-4 w-4" />
											Total:
											<Money value={sale.total} />
										</div>
										{dueMismatch ? (
											<div className="flex items-center gap-2 rounded-full bg-amber-50 px-2 py-1 text-amber-700">
												<Icons.AlertTriangle className="h-4 w-4" />
												<span>
													Stored due <Money value={sale.due} /> vs projected{" "}
													<Money value={sale.calculatedDue} />
												</span>
											</div>
										) : null}
									</div>
								</div>
							</div>
							<div className="hidden shrink-0 items-center gap-2 md:flex">
								{sale.status && (
									<Progress>
										<Progress.Status>{sale.status}</Progress.Status>
									</Progress>
								)}
								<Badge variant="outline" className="text-xs">
									{sale.paymentCount} Payment
									{sale.paymentCount !== 1 ? "s" : ""}
								</Badge>
								<Badge
									variant={dueMismatch ? "secondary" : "outline"}
									className="text-xs"
								>
									{recommendedAction}
								</Badge>

								<Action item={sale} />
							</div>
							<div className="shrink-0 md:hidden">
								<Action item={sale} />
							</div>
						</div>
					</CardHeader>
				</CollapsibleTrigger>

				<CollapsibleContent>
					<SalesData
						sale={sale}
						recommendedAction={recommendedAction}
						dueMismatch={dueMismatch}
					/>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
function Action({ item: sale }: { item: Item }) {
	const rcp = useResolutionCenterParams();
	const dueMismatch = hasDueMismatch(sale);
	const updatePayment = useAction(salesResolveUpdatePaymentAction, {
		onSuccess(args) {
			rcp.setParams({
				refreshToken: generateRandomString(),
			});
		},
	});
	const UpdateAmountDue = (
		<Menu.Item
			disabled={updatePayment?.isExecuting}
			onClick={(e) => {
				e.preventDefault();
				updatePayment.execute({
					salesId: sale.id,
				});
			}}
			icon="pendingPayment"
		>
			Sync due amount
		</Menu.Item>
	);

	return (
		<Menu disabled={updatePayment?.isExecuting} label="Resolve" noSize>
			{dueMismatch ? UpdateAmountDue : null}
			{/* <Menu.Item
                onClick={(e) => {
                    // updatePayment.execute({
                    //     salesId: sale.id,
                    // });
                }}
                SubMenu={
                    <>
                        <Menu.Item icon="wallet">Wallet</Menu.Item>
                        <Menu.Item icon="cash">Cash</Menu.Item>
                    </>
                }
                disabled={sale?.calculatedDue >= 0 || isProdClient}
                icon="pendingPayment"
                shortCut={
                    <>
                        <Money value={sale?.calculatedDue} />
                    </>
                }
            >
                Refund
            </Menu.Item> */}
		</Menu>
	);
}
