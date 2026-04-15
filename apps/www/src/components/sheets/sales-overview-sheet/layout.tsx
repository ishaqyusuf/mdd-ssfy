"use client";

import { DataSkeleton } from "@/components/data-skeleton";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";

import { Badge } from "@gnd/ui/badge";
import { cn } from "@gnd/ui/cn";
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
}: {
	tabs: LegacySalesOverviewTabDefinition[];
	activeTab: LegacySalesOverviewTabId;
}) {
	const { data } = useSaleOverview();

	return (
		<SheetHeader>
			<DataSkeletonProvider value={{ loading: !data?.id }}>
				<SheetTitle>
					<DataSkeleton pok="textLg">
						<span>
							{[data?.orderId, data?.displayName].filter(Boolean).join(" | ")}
						</span>
					</DataSkeleton>
				</SheetTitle>
			</DataSkeletonProvider>
			<SheetDescription asChild>
				<TabsList className="flex w-full justify-start">
					{tabs
						.filter((tab) => !tab.hidden)
						.map((tab) => (
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
