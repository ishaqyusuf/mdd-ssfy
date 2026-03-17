"use client";

import { DataSkeleton } from "@/components/data-skeleton";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";

import { Badge } from "@gnd/ui/badge";
import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import { TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { useSalesOverviewSystem } from "./provider";
import { useSalesOverviewTabs } from "./tab-registry";
import type { SalesOverviewTabId } from "./types";

export function SalesOverviewHeader({
	onTabChange,
}: {
	onTabChange: (tab: SalesOverviewTabId) => void;
}) {
	const { data, title } = useSalesOverviewSystem();
	const tabs = useSalesOverviewTabs();

	return (
		<SheetHeader>
			<DataSkeletonProvider value={{ loading: !data?.id }}>
				<SheetTitle>
					<DataSkeleton pok="textLg">
						<div className="flex flex-wrap items-center gap-3">
							<span>{title || "Sales Overview V2"}</span>
							{data?.type ? <Badge variant="outline">{data.type}</Badge> : null}
						</div>
					</DataSkeleton>
				</SheetTitle>
			</DataSkeletonProvider>
			<SheetDescription>
				A clean, decision-first overview built separately from the legacy sheet.
			</SheetDescription>
			<div className="space-y-2">
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
				<p className="text-sm text-muted-foreground">
					{tabs.find((tab) => tab.value === activeTab)?.description}
				</p>
			</div>
		</SheetHeader>
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
