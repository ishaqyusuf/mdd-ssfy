"use client";

import { DataSkeleton } from "@/components/data-skeleton";
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

	return (
		<SheetHeader>
			<DataSkeletonProvider value={skeletonContext}>
				<SheetTitle>
					<DataSkeleton pok="textLg">
						<span>
							{[data?.orderId, data?.displayName].filter(Boolean).join(" | ")}
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
					<TabsList className="hidden w-full justify-start sm:flex">
						{visibleTabs.map((tab) => (
							<TabsTrigger
								key={tab.value}
								value={tab.value}
								disabled={tab.disabled}
								className={cn(tab.hidden && "hidden")}
							>
								<span>{tab.label}</span>
								{tab.badge !== undefined ? (
									<Badge
										className="ml-2"
										variant={tab.badge ? "default" : "outline"}
									>
										{tab.badge}
									</Badge>
								) : null}
							</TabsTrigger>
						))}
					</TabsList>
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
