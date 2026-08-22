"use client";

import { getProductionTabItems } from "@/components/sales-overview-system/lib/production-items";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useAfterTaskTrigger } from "@/hooks/use-task-trigger";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@gnd/ui/accordion";
import { Checkbox } from "@gnd/ui/checkbox";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@gnd/ui/empty";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from "@gnd/ui/item";

import { AccessBased } from "../../access-based";
import { ProductionProvider, useProduction } from "../../context";
import { ItemProgressBar } from "../../item-progress-bar";
import {
	type ProductionItem,
	ProductionItemProvider,
} from "../../production-item-context";
import { ProductionItemMenu } from "../../production-item-menu";
import { ProductionReadinessBanner } from "../../production-readiness-banner";
import { ProductionTabFooter } from "../../production-tab-footer";
import { useProductionItemExpansion } from "../../use-production-item-expansion";
import { ProductionV2ItemDocument } from "./production-item-document";
import { ProductionTabV2Skeleton } from "./production-tab-v2-skeleton";

function ProductionV2Item({
	item,
	opened,
	workerMode,
	onToggle,
}: {
	item: ProductionItem;
	opened: boolean;
	workerMode: boolean;
	onToggle: () => void;
}) {
	const production = useProduction();

	return (
		<ProductionItemProvider args={[item]}>
			<AccordionItem
				value={item.controlUid}
				className={cn(
					"overflow-hidden bg-background transition-[border-radius,border-color]",
					opened
						? "rounded-md border border-border"
						: "rounded-none border-x-0 border-t-0 border-b border-border",
					!item.itemConfig?.production && "hidden",
				)}
			>
				<div className={cn("px-4 py-4 sm:px-5", opened && "border-b")}>
					<ItemGroup>
						<Item className="relative flex-nowrap border-0 p-0">
							<AccessBased>
								<ItemMedia>
									<Checkbox
										checked={production.selections?.[item.controlUid]}
										onCheckedChange={() =>
											production.setSelections((current) => ({
												...current,
												[item.controlUid]: !current?.[item.controlUid],
											}))
										}
									/>
								</ItemMedia>
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
							<ItemActions className="relative shrink-0 gap-1">
								<AccessBased>
									<ProductionItemMenu />
								</AccessBased>
								<AccordionTrigger
									onClick={onToggle}
									className="w-auto rounded-sm p-1 hover:bg-muted hover:no-underline"
								>
									<span className="sr-only">Toggle production item</span>
								</AccordionTrigger>
							</ItemActions>
						</Item>
					</ItemGroup>
					{workerMode ? null : (
						<div className="mt-3">
							<ItemProgressBar item={item} />
						</div>
					)}
				</div>
				<AccordionContent className="pb-0">
					<ProductionV2ItemDocument />
				</AccordionContent>
			</AccordionItem>
		</ProductionItemProvider>
	);
}

function ProductionTabV2Content() {
	const { data } = useProduction();
	const queryCtx = useSalesOverviewQuery();
	const workerMode = Boolean(queryCtx.assignedTo);
	const productionItems = getProductionTabItems(data?.items);
	const items = workerMode
		? productionItems.filter(
				(item) => Number(item.analytics?.stats?.prodAssigned?.qty || 0) > 0,
			)
		: productionItems;
	const itemUidKey = items.map((item) => item.controlUid).join(",");
	const itemUids = useMemo(
		() => (itemUidKey ? itemUidKey.split(",") : []),
		[itemUidKey],
	);
	const { expandedItemUids, toggleItem } = useProductionItemExpansion({
		itemUids,
		orderId: data?.orderId,
		workerMode,
	});

	useAfterTaskTrigger(() => {
		queryCtx.salesQuery.assignmentUpdated();
	});

	if (!data?.orderId) return <ProductionTabV2Skeleton />;

	return (
		<div className="flex flex-col gap-4 p-1">
			{items.length ? <ProductionReadinessBanner /> : null}
			<Accordion
				type="multiple"
				value={expandedItemUids}
				className="flex flex-col gap-3"
			>
				{items.length ? null : (
					<Empty className="h-[60vh]">
						<EmptyHeader>
							<EmptyTitle>No production items</EmptyTitle>
							<EmptyDescription>
								No production items were found for this order.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
				{items.map((item) => (
					<ProductionV2Item
						key={item.controlUid}
						item={item}
						opened={expandedItemUids.includes(item.controlUid)}
						workerMode={workerMode}
						onToggle={() => toggleItem(item.controlUid)}
					/>
				))}
			</Accordion>
		</div>
	);
}

export function ProductionTabV2() {
	return (
		<ProductionProvider args={[]}>
			<ProductionTabV2Content />
			<AccessBased>
				<ProductionTabFooter />
			</AccessBased>
		</ProductionProvider>
	);
}
