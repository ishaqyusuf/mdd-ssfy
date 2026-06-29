"use client";

import { DataSkeleton } from "@/components/data-skeleton";
import { SalesInboundStatusBadge } from "@/components/sales-inbound-status-badge";
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
import { TabsContent } from "@gnd/ui/tabs";

import { useSaleOverview } from "./context";
import type {
	LegacySalesOverviewTabDefinition,
	LegacySalesOverviewTabId,
} from "./types";

export function LegacySalesOverviewHeader({
	tabs,
	activeTab,
	onTabChange,
}: {
	tabs: LegacySalesOverviewTabDefinition[];
	activeTab: LegacySalesOverviewTabId;
	onTabChange?: (tab: LegacySalesOverviewTabId) => void;
}) {
	const { data } = useSaleOverview();
	const visibleTabs = tabs.filter((tab) => !tab.hidden);
	const activeTabDef =
		visibleTabs.find((tab) => tab.value === activeTab) ?? visibleTabs[0];
	const skeletonContext = {
		loading: !data?.id,
	} as unknown as ReturnType<typeof useCreateDataSkeletonCtx>;
	const showInboundStatus = !!data?.id && data?.type !== "quote";

	return (
		<SheetHeader>
			<DataSkeletonProvider value={skeletonContext}>
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
									<SalesInboundStatusBadge
										status={data?.inboundStatus}
										emptyFallback="No status"
										className="h-5 px-2 text-[10px]"
										emptyClassName="text-[11px] font-medium"
									/>
								</span>
							) : null}
						</span>
					</DataSkeleton>
				</SheetTitle>
			</DataSkeletonProvider>
			<SheetDescription asChild>
				<div className="w-full">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
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
					<div
						aria-label="Sales overview tabs"
						className="hidden h-auto w-fit max-w-full flex-wrap justify-start gap-1 rounded-md border border-border bg-muted/40 p-1 sm:flex"
						role="tablist"
					>
						{visibleTabs.map((tab) => {
							const isActive = tab.value === activeTab;

							return (
								<Button
									aria-selected={isActive}
									className={cn(
										"h-8 rounded-sm px-3 text-xs uppercase",
										isActive
											? "bg-foreground text-background shadow-sm hover:bg-foreground/90"
											: "text-muted-foreground hover:bg-background hover:text-foreground",
										tab.hidden && "hidden",
									)}
									disabled={tab.disabled}
									key={tab.value}
									onClick={() => onTabChange?.(tab.value)}
									role="tab"
									size="sm"
									tabIndex={isActive ? 0 : -1}
									type="button"
									variant={isActive ? "default" : "ghost"}
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
								</Button>
							);
						})}
					</div>
				</div>
			</SheetDescription>
		</SheetHeader>
	);
}

export function LegacySalesOverviewPanels({
	tabs,
}: {
	tabs: LegacySalesOverviewTabDefinition[];
}) {
	return (
		<>
			{tabs.map((tab) => (
				<TabsContent key={tab.value} value={tab.value}>
					{tab.content ?? null}
				</TabsContent>
			))}
		</>
	);
}
