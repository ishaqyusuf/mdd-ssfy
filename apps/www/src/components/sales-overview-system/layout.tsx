"use client";

import { DataSkeleton } from "@/components/data-skeleton";
import {
	DataSkeletonProvider,
	type useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

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
		state: { data, title },
		meta: { isLoading },
	} = useSalesOverviewSystem();
	const tabs = useSalesOverviewTabs();
	const activeTabDef = tabs.find((tab) => tab.value === activeTab);
	const skeletonContext = {
		loading: isLoading && !data?.id,
	} as unknown as ReturnType<typeof useCreateDataSkeletonCtx>;

	return (
		<div className="flex flex-col space-y-2 text-center sm:text-left">
			<DataSkeletonProvider value={skeletonContext}>
				<div className="text-lg font-semibold text-foreground">
					<DataSkeleton pok="textLg">
						<div className="flex flex-wrap items-center gap-3">
							<span>{title || "Sales Overview"}</span>
							{data?.type ? <Badge variant="outline">{data.type}</Badge> : null}
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
								onSelect={() => onTabChange(tab.value)}
								className="min-w-0"
							>
								<span className="truncate">{tab.label}</span>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
				<TabsList className="hidden w-full justify-start sm:flex">
					{tabs.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							onClick={() => onTabChange(tab.value)}
						>
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>
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
				>
					{tab.content}
				</TabsContent>
			))}
		</>
	);
}
