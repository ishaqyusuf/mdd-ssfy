"use client";

import { DataSkeleton } from "@/components/data-skeleton";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";

import { Badge } from "@gnd/ui/badge";
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

	return (
		<div className="flex flex-col space-y-2 text-center sm:text-left">
			<DataSkeletonProvider value={{ loading: isLoading && !data?.id }}>
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
				<TabsList className="flex w-full justify-start">
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
					forceMount={tab.value === activeTab}
				>
					{tab.content}
				</TabsContent>
			))}
		</>
	);
}
