"use client";

import { DataSkeleton } from "@/components/data-skeleton";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesOverviewV2PageQuery } from "@/hooks/use-sales-overview-v2-page-query";
import { useSalesOverviewV2SheetQuery } from "@/hooks/use-sales-overview-v2-sheet-query";
import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";

import { Badge } from "@gnd/ui/badge";
import { cn } from "@gnd/ui/cn";
import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { TransactionsTab } from "../customer-overview-sheet/transactions-tab";
import { SalesOverviewProvider, useSaleOverview } from "./context";
import { DispatchTab } from "./dispatch-tab";
import { GeneralTab } from "./general-tab";
import { PackingTab } from "./packing-tab";
import { ProductionTab } from "./production-tab";

export default function SalesOverviewSheet() {
	const query = useSalesOverviewQuery();
	const v2PageQuery = useSalesOverviewV2PageQuery();
	const v2SheetQuery = useSalesOverviewV2SheetQuery();

	return query["sales-overview-id"] &&
		!v2PageQuery.params.overviewId &&
		!v2SheetQuery.params.overviewSheetId ? (
		<Modal />
	) : null;
}
function Modal() {
	return (
		<SalesOverviewProvider args={[]}>
			<Content />
		</SalesOverviewProvider>
	);
}
function Content() {
	usePageTitle();
	const query = useSalesOverviewQuery();
	const customerQuery = useCustomerOverviewQuery();
	const { data } = useSaleOverview();
	const prodQty = data?.salesStat?.prodAssigned?.total;
	const ProdBadge = (
		<>
			<Badge className="ml-2" variant={prodQty ? "default" : "outline"}>
				{prodQty || 0}
			</Badge>
		</>
	);
	const isQuote = data?.type === "quote";
	// const dispatchQty = data?.
	const mode = query?.viewMode;
	return (
		<CustomSheet
			sheetName="sales-overview-sheet"
			open
			onOpenChange={query.close}
			floating
			rounded
			size="2xl"
		>
			<Tabs
				value={query?.params?.salesTab}
				onValueChange={(e) => {
					query.setParams({
						salesTab: e as typeof query.params.salesTab,
						"prod-item-tab": null,
						"prod-item-view": null,

						dispatchOverviewId: null,
					});
				}}
			>
				<SheetHeader>
					<DataSkeletonProvider value={{ loading: !data?.id }}>
						<SheetTitle>
							<DataSkeleton pok="textLg">
								<span>{[data?.orderId, data?.displayName]?.join(" | ")}</span>
							</DataSkeleton>
						</SheetTitle>
					</DataSkeletonProvider>
					<SheetDescription asChild>
						<TabsList className="flex w-full justify-start">
							{query?.assignedTo ? (
								<>
									<TabsTrigger value="production">Productions</TabsTrigger>
									<TabsTrigger value="production-notes">Notes</TabsTrigger>
								</>
							) : mode === "dispatch-modal" ? (
								<>
									<TabsTrigger value="production">Productions</TabsTrigger>
									<TabsTrigger value="dispatch-notes">General</TabsTrigger>
									<TabsTrigger value="packing">Packing List</TabsTrigger>
								</>
							) : (
								<>
									<TabsTrigger value="general">General</TabsTrigger>
									<TabsTrigger
										disabled={!prodQty}
										className={cn(!isQuote || "hidden")}
										value="production"
									>
										<span>Productions</span>
										{ProdBadge}
									</TabsTrigger>
									<TabsTrigger
										className={cn(!isQuote || "hidden")}
										value="transactions"
									>
										Transactions
									</TabsTrigger>
									<TabsTrigger
										className={cn(!isQuote || "hidden")}
										value="dispatch"
									>
										Dispatch
									</TabsTrigger>
								</>
							)}
						</TabsList>
					</SheetDescription>
				</SheetHeader>
			</Tabs>
			<CustomSheetContent className="-mt-4">
				<Tabs value={query?.params?.salesTab}>
					{query?.assignedTo ? (
						<>
							<TabsContent value="production">
								<ProductionTab />
							</TabsContent>
							<TabsContent value="production-notes">
								<Note
									subject={"Production Note"}
									headline=""
									statusFilters={["public"]}
									typeFilters={["production", "general"]}
									tagFilters={[noteTagFilter("salesId", data?.id)]}
								/>
							</TabsContent>
						</>
					) : mode === "dispatch-modal" ? (
						<>
							<TabsContent value="production">
								<ProductionTab />
							</TabsContent>
							<TabsContent value="packing">
								<PackingTab />
							</TabsContent>
						</>
					) : (
						<>
							<TabsContent value="general">
								<GeneralTab />
							</TabsContent>
							<TabsContent value="production">
								<ProductionTab />
							</TabsContent>
							<TabsContent value="transactions">
								<TransactionsTab salesId={data?.orderId} />
							</TabsContent>
							<TabsContent value="dispatch">
								<DispatchTab />
							</TabsContent>
							<TabsContent value="packing">
								<PackingTab />
							</TabsContent>
						</>
					)}
				</Tabs>
			</CustomSheetContent>
		</CustomSheet>
	);
}
