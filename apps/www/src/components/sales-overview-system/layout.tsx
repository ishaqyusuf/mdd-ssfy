"use client";

import { DataSkeleton } from "@/components/data-skeleton";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";

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
						<span>{title}</span>
					</DataSkeleton>
				</SheetTitle>
			</DataSkeletonProvider>
			<SheetDescription asChild>
				<TabsList className="flex w-full justify-start">
					{tabs.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							disabled={tab.disabled}
							onClick={() => onTabChange(tab.value)}
						>
							<span>{tab.label}</span>
							{tab.badge}
						</TabsTrigger>
					))}
				</TabsList>
			</SheetDescription>
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
