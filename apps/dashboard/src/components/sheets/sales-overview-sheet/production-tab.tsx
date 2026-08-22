import { DataSkeleton } from "@/components/data-skeleton";
import { EmptyState } from "@/components/empty-state";
import { getProductionTabItems } from "@/components/sales-overview-system/lib/production-items";
import {
	DataSkeletonProvider,
	type useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useAfterTaskTrigger } from "@/hooks/use-task-trigger";
import { cn } from "@/lib/utils";
import { skeletonListData } from "@/utils/format";
import { useMemo } from "react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@gnd/ui/accordion";
import { Card, CardHeader } from "@gnd/ui/card";
import { Checkbox } from "@gnd/ui/checkbox";
import { ItemContent, ItemDescription, ItemTitle } from "@gnd/ui/item";

import { AccessBased } from "./access-based";
import { ProductionProvider, useProduction } from "./context";
import { ItemProgressBar } from "./item-progress-bar";
import {
	type ProductionItem,
	ProductionItemProvider,
} from "./production-item-context";
import { ProductionItemDetail } from "./production-item-detail";
import { ProductionItemMenu } from "./production-item-menu";
import { ProductionReadinessBanner } from "./production-readiness-banner";
import { ProductionTabFooter } from "./production-tab-footer";
import { useProductionItemExpansion } from "./use-production-item-expansion";

export function ProductionTab() {
	return (
		<ProductionProvider args={[]}>
			<Content />
			<AccessBased>
				<ProductionTabFooter />
			</AccessBased>
		</ProductionProvider>
	);
}
function Content() {
	const { data } = useProduction();
	const queryCtx = useSalesOverviewQuery();
	const workerMode = Boolean(queryCtx.assignedTo);
	const productionItems = getProductionTabItems(data?.items);
	const items = workerMode
		? productionItems.filter(
				(item) => Number(item?.analytics?.stats?.prodAssigned?.qty || 0) > 0,
			)
		: productionItems;
	const itemCount = items?.length || 0;
	const itemUidKey = items.map((item) => item.controlUid).join(",");
	const itemUids = useMemo(
		() => (itemUidKey ? itemUidKey.split(",") : []),
		[itemUidKey],
	);
	const { expandedItemUids, toggleItem } = useProductionItemExpansion({
		itemUids,
		orderId: data?.orderId,
		workerMode,
		legacyTabState: true,
	});
	useAfterTaskTrigger(() => {
		queryCtx.salesQuery.assignmentUpdated();
	});
	return (
		<DataSkeletonProvider
			value={
				{
					loading: !data?.orderId,
				} as unknown as ReturnType<typeof useCreateDataSkeletonCtx>
			}
		>
			<div className="mt-0 space-y-6">
				{itemCount > 0 ? <ProductionReadinessBanner /> : null}
				<Accordion
					type="multiple"
					value={expandedItemUids}
					className="space-y-4"
				>
					<EmptyState
						className="h-[70vh]"
						description="No production items found"
						icon="production"
						empty={data?.orderId && !itemCount}
					/>

					{skeletonListData(items, 5).map((item, i) => (
						<DataSkeleton
							className="h-48"
							key={item?.controlUid || `skeleton-${i}`}
						>
							<ItemCard
								item={item}
								key={item?.controlUid || `item-${i}`}
								onToggle={() => toggleItem(item.controlUid)}
								opened={expandedItemUids.includes(item.controlUid)}
								workerMode={workerMode}
							/>
						</DataSkeleton>
					))}
				</Accordion>
			</div>
		</DataSkeletonProvider>
	);
}
export interface ItemCardProps {
	item: ProductionItem;
}
function ItemCard({
	item,
	onToggle,
	opened,
	workerMode,
}: ItemCardProps & {
	onToggle: () => void;
	opened: boolean;
	workerMode: boolean;
}) {
	const prod = useProduction();

	return (
		<ProductionItemProvider args={[item]}>
			<AccordionItem
				value={item.controlUid}
				className={cn(
					"overflow-hidden border-border",
					opened && "border-b-0",
					!item?.itemConfig?.production && "hidden",
				)}
			>
				<Card className={opened ? "border-2" : "border-0"}>
					<CardHeader
						className={cn("space-y-3 px-4 pb-2 pt-4", opened && "border-b")}
					>
						<div className="flex items-start gap-4">
							<AccessBased>
								<div className="mt-1">
									<Checkbox
										checked={prod.selections?.[item?.controlUid]}
										onCheckedChange={(e) => {
											prod.setSelections((current) => ({
												...current,
												[item?.controlUid]: !current?.[item.controlUid],
											}));
										}}
										className="size-5"
									/>
								</div>
							</AccessBased>
							<ItemContent className="relative min-w-0">
								<ItemTitle className="uppercase">
									<button
										type="button"
										className="cursor-pointer text-left after:absolute after:inset-0"
										onClick={onToggle}
									>
										{item.title}
									</button>
								</ItemTitle>
								<ItemDescription className="uppercase">
									{item.subtitle}
								</ItemDescription>
							</ItemContent>

							<div className="flex shrink-0 items-center gap-1">
								<AccessBased>
									<ProductionItemMenu />
								</AccessBased>
								<AccordionTrigger
									onClick={onToggle}
									className="mt-0.5 w-auto shrink-0 rounded-sm p-1 hover:bg-muted hover:no-underline"
								>
									<span className="sr-only">Toggle production item</span>
								</AccordionTrigger>
							</div>
						</div>
						{workerMode ? null : <ItemProgressBar item={item} />}
					</CardHeader>
					<AccordionContent className="">
						<ProductionItemDetail />
					</AccordionContent>
				</Card>
			</AccordionItem>
		</ProductionItemProvider>
	);
}
