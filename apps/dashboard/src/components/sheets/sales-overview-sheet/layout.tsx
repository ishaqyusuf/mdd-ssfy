"use client";

import { DataSkeleton } from "@/components/data-skeleton";
import {
	type InventoryInboundOwnershipLike,
	InventoryInboundStatusBadge,
	SalesInboundStatusBadge,
	getInventoryInboundOwnershipTitle,
	getSingleInventoryInboundId,
} from "@/components/sales-inbound-status-badge";
import { useSalesInventorySegmentQuery } from "@/components/sales-overview-system/hooks/use-sales-inventory-segment-query";
import { getSalesOverviewDocumentStatus } from "@/components/sales-overview-system/lib/document-status";
import { SalesPrioritySelect } from "@/components/sales-priority-control";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import {
	DataSkeletonProvider,
	type useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import { TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { useSaleOverview } from "./context";
import type {
	LegacySalesOverviewTabDefinition,
	LegacySalesOverviewTabId,
} from "./types";

type SalesOverviewHeaderData = NonNullable<
	ReturnType<typeof useSaleOverview>["data"]
> & {
	inventoryInboundOwnership?: InventoryInboundOwnershipLike | null;
	generalViewVersion?: "v1" | "v2";
	priority?: string | null;
	salesDate?: string | null;
};

export function LegacySalesOverviewHeader({
	tabs,
	activeTab,
	onTabChange,
}: {
	tabs: LegacySalesOverviewTabDefinition[];
	activeTab: LegacySalesOverviewTabId;
	onTabChange?: (tab: LegacySalesOverviewTabId) => void;
}) {
	const { data: contextData } = useSaleOverview();
	const query = useSalesOverviewQuery();
	const data = contextData as SalesOverviewHeaderData | undefined;
	const { setInventorySegment } = useSalesInventorySegmentQuery();
	const visibleTabs = tabs.filter((tab) => !tab.hidden);
	const activeTabDef =
		visibleTabs.find((tab) => tab.value === activeTab) ?? visibleTabs[0];
	const skeletonContext = {
		loading: !data?.id,
	} as unknown as ReturnType<typeof useCreateDataSkeletonCtx>;
	const showInboundStatus = !!data?.id && data?.type !== "quote";
	const isV2Header = data?.generalViewVersion === "v2";
	const isQuote = data?.type === "quote";
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
		onTabChange?.("inventory");
	};

	return (
		<SheetHeader>
			<DataSkeletonProvider value={skeletonContext}>
				{isV2Header ? (
					<div className="flex min-w-0 items-start justify-between gap-3 pr-7">
						<div className="min-w-0">
							<p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
								Sales overview · {isQuote ? "Quote" : "Order"}
							</p>
							<SheetTitle>
								<DataSkeleton pok="textLg">
									<span className="block truncate">
										{[data?.orderId, data?.displayName]
											.filter(Boolean)
											.join(" | ")}
									</span>
								</DataSkeleton>
							</SheetTitle>
							<div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
								<span className="font-medium text-foreground/80">
									{documentStatus.label}
								</span>
								{showInboundStatus ? (
									<>
										<span aria-hidden="true">•</span>
										<span className="inline-flex items-center gap-1.5">
											<span>Inbound</span>
											{hasInventoryInbound ? (
												<Button
													type="button"
													variant="ghost"
													className="h-auto rounded-full p-0 hover:bg-transparent"
													onClick={openInventoryInbounds}
													title={getInventoryInboundOwnershipTitle(
														data?.inventoryInboundOwnership,
													)}
												>
													<InventoryInboundStatusBadge
														ownership={data?.inventoryInboundOwnership}
														className="h-5 px-2 text-[10px]"
													/>
												</Button>
											) : (
												<SalesInboundStatusBadge
													status={data?.inboundStatus}
													emptyFallback="No status"
													title="Manual order status"
													className="h-5 px-2 text-[10px]"
													emptyClassName="text-[11px] font-medium"
												/>
											)}
										</span>
									</>
								) : null}
								{data?.salesDate ? (
									<>
										<span aria-hidden="true">•</span>
										<span>Updated {data.salesDate}</span>
									</>
								) : null}
							</div>
						</div>
						{!isQuote && !query.assignedTo ? (
							<SalesPrioritySelect
								salesId={data?.id}
								orderId={data?.orderId}
								priority={data?.priority}
								triggerClassName="w-[112px] rounded-md"
								showBadge={false}
							/>
						) : null}
					</div>
				) : (
					<SheetTitle>
						<DataSkeleton pok="textLg">
							<span className="flex flex-wrap items-center gap-2">
								<span>
									{[data?.orderId, data?.displayName]
										.filter(Boolean)
										.join(" | ")}
								</span>
								{showInboundStatus ? (
									<span className="inline-flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
										<span className="text-[10px] font-semibold uppercase">
											Inbound
										</span>
										{hasInventoryInbound ? (
											<Button
												type="button"
												variant="ghost"
												className="h-auto rounded-full p-0 hover:bg-transparent"
												onClick={openInventoryInbounds}
												title={getInventoryInboundOwnershipTitle(
													data?.inventoryInboundOwnership,
												)}
											>
												<InventoryInboundStatusBadge
													ownership={data?.inventoryInboundOwnership}
													className="h-5 px-2 text-[10px]"
												/>
											</Button>
										) : (
											<SalesInboundStatusBadge
												status={data?.inboundStatus}
												emptyFallback="No status"
												title="Manual order status"
												className="h-5 px-2 text-[10px]"
												emptyClassName="text-[11px] font-medium"
											/>
										)}
									</span>
								) : null}
							</span>
						</DataSkeleton>
					</SheetTitle>
				)}
			</DataSkeletonProvider>
			<SheetDescription asChild>
				<div className="w-full border-b border-border">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								data-sales-overview-initial-focus
								type="button"
								variant="outline"
								className="flex h-9 w-full min-w-0 justify-between rounded-md border-border/70 bg-background px-3 text-sm font-medium sm:hidden"
							>
								<span className="flex min-w-0 items-center gap-2">
									<span className="truncate">
										{activeTabDef?.label ?? "Overview"}
									</span>
									{activeTabDef?.badge !== undefined ? (
										<Badge
											className="h-5 shrink-0 px-1.5 text-[10px]"
											variant={activeTabDef.badge ? "default" : "outline"}
										>
											{activeTabDef.badge}
										</Badge>
									) : null}
								</span>
								<Icons.ChevronDown className="ml-2 size-3.5 shrink-0 text-muted-foreground" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="start"
							className="w-[calc(100vw-2rem)] max-w-[22rem]"
						>
							{visibleTabs.map((tab) => (
								<DropdownMenuItem
									key={tab.value}
									disabled={tab.disabled}
									onSelect={() => onTabChange?.(tab.value)}
									className="flex items-center justify-between gap-3"
								>
									<span className="min-w-0 truncate">{tab.label}</span>
									{tab.badge !== undefined ? (
										<Badge
											className="h-5 shrink-0 px-1.5 text-[10px]"
											variant={tab.badge ? "default" : "outline"}
										>
											{tab.badge}
										</Badge>
									) : null}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
					<TabsList
						aria-label="Sales overview tabs"
						className="hidden h-auto w-fit max-w-full flex-wrap justify-start gap-1 rounded-md border border-border bg-muted/40 p-1 sm:flex"
					>
						{visibleTabs.map((tab) => {
							const isActive = tab.value === activeTab;

							return (
								<TabsTrigger
									className={cn(
										"h-8 min-h-8 rounded-sm px-3 text-xs uppercase data-[state=active]:translate-y-0",
										isActive
											? "bg-foreground text-background shadow-sm hover:bg-foreground/90"
											: "text-muted-foreground hover:bg-background hover:text-foreground",
										tab.hidden && "hidden",
									)}
									disabled={tab.disabled}
									data-sales-overview-initial-focus={
										isActive ? "true" : undefined
									}
									key={tab.value}
									value={tab.value}
								>
									<span>{tab.label}</span>
									{tab.badge !== undefined ? (
										<Badge
											className={cn(
												"ml-1.5 h-4 px-1.5 text-[10px] leading-none",
												isActive && "bg-background/15 text-background",
											)}
											variant={tab.badge ? "default" : "outline"}
										>
											{tab.badge}
										</Badge>
									) : null}
								</TabsTrigger>
							);
						})}
					</TabsList>
				</div>
			</SheetDescription>
		</SheetHeader>
	);
}

export function LegacySalesOverviewPanels({
	activeTab,
	tabs,
}: {
	activeTab: LegacySalesOverviewTabId;
	tabs: LegacySalesOverviewTabDefinition[];
}) {
	return (
		<>
			{tabs.map((tab) => (
				<TabsContent key={tab.value} value={tab.value}>
					{tab.value === activeTab ? (tab.content ?? null) : null}
				</TabsContent>
			))}
		</>
	);
}
