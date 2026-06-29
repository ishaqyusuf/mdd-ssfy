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
import { TabsContent } from "@gnd/ui/tabs";

import { useSalesOverviewSystem } from "./provider";
import { useSalesOverviewTabs } from "./tab-registry";
import type { SalesOverviewTabId } from "./types";

export function SalesOverviewHeader({
	activeTab,
	onTabChange,
}: {
	activeTab: SalesOverviewTabId;
	onTabChange: (tab: SalesOverviewTabId) => void;
}) {
	const {
		state: { data, surface, title },
		meta: { isLoading },
	} = useSalesOverviewSystem();
	const tabs = useSalesOverviewTabs();
	const activeTabDef = tabs.find((tab) => tab.value === activeTab);
	const skeletonContext = {
		loading: isLoading && !data?.id,
	} as unknown as ReturnType<typeof useCreateDataSkeletonCtx>;
	const showInboundStatus =
		surface === "sheet" && !!data?.id && data?.type !== "quote";

	return (
		<div className="flex flex-col space-y-2 text-center sm:text-left">
			<DataSkeletonProvider value={skeletonContext}>
				<div className="text-lg font-semibold text-foreground">
					<DataSkeleton pok="textLg">
						<div className="flex flex-wrap items-center gap-3">
							<span>{title || "Sales Overview"}</span>
							{data?.type ? <Badge variant="outline">{data.type}</Badge> : null}
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
						</div>
					</DataSkeleton>
				</div>
			</DataSkeletonProvider>
			<div className="space-y-2 text-sm text-muted-foreground">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className="flex h-9 w-full min-w-0 justify-between rounded-md border-border/70 bg-background px-3 text-sm font-medium text-foreground sm:hidden"
						>
							<span className="truncate">
								{activeTabDef?.label ?? "Overview"}
							</span>
							<Icons.ChevronDown className="ml-2 size-3.5 shrink-0 text-muted-foreground" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="w-[calc(100vw-2rem)] max-w-[22rem]"
					>
						{tabs.map((tab) => (
							<DropdownMenuItem
								key={tab.value}
								disabled={tab.disabled}
								onSelect={() => onTabChange(tab.value)}
								className="flex min-w-0 items-center justify-between gap-3"
							>
								<span className="truncate">{tab.label}</span>
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
					{tabs.map((tab) => {
						const isActive = tab.value === activeTab;

						return (
							<Button
								aria-selected={isActive}
								className={cn(
									"h-8 rounded-sm px-3 text-xs uppercase",
									isActive
										? "bg-foreground text-background shadow-sm hover:bg-foreground/90"
										: "text-muted-foreground hover:bg-background hover:text-foreground",
								)}
								disabled={tab.disabled}
								key={tab.value}
								onClick={() => onTabChange(tab.value)}
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
				{activeTabDef?.description ? (
					<p className="text-xs text-muted-foreground">
						{activeTabDef.description}
					</p>
				) : null}
			</div>
		</div>
	);
}

export function SalesOverviewPanels({
	activeTab,
}: {
	activeTab: SalesOverviewTabId;
}) {
	const tabs = useSalesOverviewTabs();

	return (
		<>
			{tabs.map((tab) => (
				<TabsContent
					key={tab.value}
					value={tab.value}
					forceMount={tab.value === activeTab ? true : undefined}
					className="min-w-0"
				>
					{tab.content}
				</TabsContent>
			))}
		</>
	);
}
