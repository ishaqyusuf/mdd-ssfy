"use client";

import { getProductionTabItems } from "@/components/sales-overview-system/lib/production-items";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useAfterTaskTrigger } from "@/hooks/use-task-trigger";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@gnd/ui/accordion";
import { Badge } from "@gnd/ui/badge";
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
import {
	type ProductionItem,
	ProductionItemProvider,
} from "../../production-item-context";
import { ProductionItemMenu } from "../../production-item-menu";
import { ProductionReadinessBanner } from "../../production-readiness-banner";
import { ProductionTabFooter } from "../../production-tab-footer";
import { getWorkerProductionSubmissionProgress } from "../../production-worker-policy";
import { useProductionItemExpansion } from "../../use-production-item-expansion";
import { ProductionInboundSummary } from "./production-inbound-summary";
import {
	PRODUCTION_ITEM_ACCORDION_SETTLE_MS,
	PRODUCTION_ITEM_SCROLL_VIEWPORT_SELECTOR,
	getProductionItemAlignedScrollTop,
	isProductionItemBelowViewportMidpoint,
} from "./production-item-auto-scroll";
import { ProductionV2ItemDocument } from "./production-item-document";
import {
	getProductionItemPresentation,
	getWorkerProductionItemPresentation,
} from "./production-item-presentation";
import { ProductionItemStatusBadges } from "./production-item-status-badges";
import { ProductionTabV2Skeleton } from "./production-tab-v2-skeleton";

const ProductionMaterialReviewPanel = dynamic(
	() =>
		import("@/components/production-v2/shared").then(
			(module) => module.ProductionMaterialReviewPanel,
		),
	{ ssr: false },
);

function ProductionV2Item({
	item,
	opened,
	workerMode,
	followedByOpened,
	onToggle,
}: {
	item: ProductionItem;
	opened: boolean;
	workerMode: boolean;
	followedByOpened: boolean;
	onToggle: () => void;
}) {
	const production = useProduction();
	const workerPresentation = workerMode
		? getWorkerProductionItemPresentation(
				item,
				item.analytics?.stats?.prodAssigned,
			)
		: null;
	const presentation =
		workerPresentation ?? getProductionItemPresentation(item);
	const workerProgress = workerMode
		? getWorkerProductionSubmissionProgress(item)
		: null;
	const itemRef = useRef<HTMLDivElement>(null);
	const scrollTimerRef = useRef<number | null>(null);
	const scrollFrameRef = useRef<number | null>(null);

	useEffect(
		() => () => {
			if (scrollTimerRef.current !== null) {
				window.clearTimeout(scrollTimerRef.current);
			}
			if (scrollFrameRef.current !== null) {
				window.cancelAnimationFrame(scrollFrameRef.current);
			}
		},
		[],
	);

	const prepareAutoScroll = () => {
		const itemElement = itemRef.current;
		const viewport = itemElement?.closest<HTMLElement>(
			PRODUCTION_ITEM_SCROLL_VIEWPORT_SELECTOR,
		);
		if (!itemElement || !viewport) return;

		const itemRect = itemElement.getBoundingClientRect();
		const viewportRect = viewport.getBoundingClientRect();
		if (
			!isProductionItemBelowViewportMidpoint({
				itemTop: itemRect.top,
				viewportHeight: viewportRect.height,
				viewportTop: viewportRect.top,
			})
		) {
			return;
		}

		if (scrollTimerRef.current !== null) {
			window.clearTimeout(scrollTimerRef.current);
		}
		scrollTimerRef.current = window.setTimeout(() => {
			scrollTimerRef.current = null;
			scrollFrameRef.current = window.requestAnimationFrame(() => {
				scrollFrameRef.current = null;
				const currentItemElement = itemRef.current;
				const currentViewport = currentItemElement?.closest<HTMLElement>(
					PRODUCTION_ITEM_SCROLL_VIEWPORT_SELECTOR,
				);
				if (!currentItemElement || !currentViewport) return;

				const currentItemRect = currentItemElement.getBoundingClientRect();
				const currentViewportRect = currentViewport.getBoundingClientRect();
				currentViewport.scrollTo({
					behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
						.matches
						? "auto"
						: "smooth",
					top: getProductionItemAlignedScrollTop({
						itemTop: currentItemRect.top,
						scrollTop: currentViewport.scrollTop,
						viewportTop: currentViewportRect.top,
					}),
				});
			});
		}, PRODUCTION_ITEM_ACCORDION_SETTLE_MS);
	};

	const handleTitleToggle = () => {
		prepareAutoScroll();
		onToggle();
	};

	return (
		<ProductionItemProvider args={[item]}>
			<AccordionItem
				ref={itemRef}
				value={item.controlUid}
				className={cn(
					"overflow-hidden bg-background transition-[border-radius,border-color]",
					opened
						? "rounded-md border border-border"
						: "rounded-none border-x-0 border-t-0 border-b border-border",
					followedByOpened && "border-b-transparent",
					!item.itemConfig?.production && "hidden",
				)}
			>
				<div
					className={cn(
						"px-4 py-4 transition-colors sm:px-5",
						opened
							? "border-b bg-muted/70 hover:bg-muted/80"
							: "hover:bg-muted/50",
					)}
				>
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
										onClick={handleTitleToggle}
										aria-expanded={opened}
									>
										{presentation.title}
									</button>
								</ItemTitle>
								{workerProgress && workerPresentation ? (
									<div className="mt-1 flex flex-wrap items-center gap-1.5">
										{presentation.subtitle ? (
											<ItemDescription className="w-fit rounded-md border border-border/80 bg-muted/70 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/85">
												{presentation.subtitle}
											</ItemDescription>
										) : null}
										<Badge className="gap-1.5 whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary">
											<span>QTY</span>
											<span className="font-bold tabular-nums">
												{workerPresentation.assignedQuantity.qty ||
													workerProgress.assigned}
											</span>
											{workerPresentation.assignedQuantity.lh > 0 ? (
												<>
													<span aria-hidden="true" className="opacity-50">
														·
													</span>
													<span>LH</span>
													<span className="font-bold tabular-nums">
														{workerPresentation.assignedQuantity.lh}
													</span>
												</>
											) : null}
											{workerPresentation.assignedQuantity.rh > 0 ? (
												<>
													<span aria-hidden="true" className="opacity-50">
														·
													</span>
													<span>RH</span>
													<span className="font-bold tabular-nums">
														{workerPresentation.assignedQuantity.rh}
													</span>
												</>
											) : null}
										</Badge>
									</div>
								) : (
									<>
										{presentation.subtitle ? (
											<ItemDescription className="mt-1 w-fit rounded-md border border-border/80 bg-muted/70 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/85">
												{presentation.subtitle}
											</ItemDescription>
										) : null}
										<ProductionItemStatusBadges item={item} />
									</>
								)}
							</ItemContent>
							<ItemActions className="relative shrink-0 gap-1">
								<AccessBased>
									<ProductionItemMenu />
								</AccessBased>
								<AccordionTrigger
									className="w-auto rounded-sm p-1 hover:bg-muted hover:no-underline"
									onClick={prepareAutoScroll}
								>
									<span className="sr-only">Toggle production item</span>
								</AccordionTrigger>
							</ItemActions>
						</Item>
					</ItemGroup>
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
		singleOpen: true,
		workerMode,
	});

	useAfterTaskTrigger(() => {
		queryCtx.salesQuery.assignmentUpdated();
	});

	if (!data?.orderId) return <ProductionTabV2Skeleton />;

	return (
		<div className="flex flex-col gap-4 p-1">
			<AccessBased>
				<ProductionMaterialReviewPanel
					orderContext
					search={queryCtx.params["sales-overview-id"]}
				/>
			</AccessBased>
			{items.length ? <ProductionReadinessBanner /> : null}
			{workerMode && items.length ? <ProductionInboundSummary /> : null}
			<Accordion
				type="single"
				value={expandedItemUids[0] ?? ""}
				onValueChange={(itemUid) => {
					if (itemUid) toggleItem(itemUid);
				}}
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
				{items.map((item, index) => (
					<ProductionV2Item
						key={item.controlUid}
						item={item}
						opened={expandedItemUids.includes(item.controlUid)}
						workerMode={workerMode}
						followedByOpened={
							index < items.length - 1 &&
							expandedItemUids.includes(items[index + 1]?.controlUid || "")
						}
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
