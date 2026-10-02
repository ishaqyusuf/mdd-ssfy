"use client";

import { StockPolicyDialog } from "@/components/inventory/stock-policy-dialog";
import type { WorkflowStockCatalogComponent } from "@/components/inventory/workflow-stock/context";
import { WorkflowStockCorner } from "@/components/inventory/workflow-stock/stock-status";
import { useAuth } from "@/hooks/use-auth";
import { useInventoryStockParams } from "@/hooks/use-inventory-stock-params";
import { useTRPC } from "@/trpc/client";
import {
	type WorkflowComponentRecord,
	WorkflowStepComponentPanel,
	type WorkflowStepComponentPanelProps,
} from "@gnd/sales/sales-form";
import { Menu } from "@gnd/ui/custom/menu";
import { useQuery } from "@gnd/ui/tanstack";
import { Package } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";

const WorkflowStockSheet = dynamic(
	() =>
		import("@/components/inventory/workflow-stock/sheet").then(
			(module) => module.WorkflowStockSheet,
		),
	{ ssr: false },
);

export function StockWorkflowComponentPanel<T extends WorkflowComponentRecord>(
	props: WorkflowStepComponentPanelProps<T>,
) {
	const [open, setOpen] = useState(false);
	const [inventory, setInventory] = useState<{
		uid: string | null;
		trigger?: HTMLElement;
	} | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const auth = useAuth();
	const { setParams } = useInventoryStockParams();
	const stepId = Number(props.activeStep.stepId || props.activeStep.step?.id);
	const trpc = useTRPC();
	const componentUids = Array.from(
		new Set(
			props.filteredComponents
				.map((component) => String(component.uid || ""))
				.filter(Boolean),
		),
	)
		.sort()
		.slice(0, 300);
	const stocks = useQuery(
		trpc.inventories.workflowStock.queryOptions(
			{ stepId: stepId || 1, componentUids, includeVariants: false },
			{ enabled: !!stepId, staleTime: 15_000 },
		),
	);
	const summaries = new Map(
		stocks.data?.components.map(
			(component) => [component.uid, component] as const,
		),
	);
	const catalog = new Map<string, WorkflowStockCatalogComponent>();
	for (const component of [
		...props.components,
		...(props.catalogComponents || []),
		...props.filteredComponents,
	]) {
		if (component.uid && !component.isDeleted)
			catalog.set(String(component.uid), {
				uid: String(component.uid),
				title: props.componentLabel(component.title),
				imageSrc: props.resolveImageSrc(component.img),
			});
	}
	const canOpenInventory = Boolean(
		stepId && (stocks.data?.tracked || stocks.isError || stocks.isPending),
	);
	const showInventory = (uid: string | null, trigger?: HTMLElement) =>
		setInventory({ uid, trigger });
	const stockStatusSlot = (component: T) => {
		if (!stepId || (stocks.data && !stocks.data.tracked)) return null;
		const summary = summaries.get(String(component.uid));
		const status = stocks.isError
			? "unavailable"
			: stocks.isPending || !componentUids.includes(String(component.uid))
				? "loading"
				: summary?.mapped && summary.status
					? summary.status
					: "mapping";
		return (
			<WorkflowStockCorner
				status={status}
				title={props.componentLabel(component.title)}
				uid={String(component.uid)}
				onOpen={(trigger) => showInventory(String(component.uid), trigger)}
			/>
		);
	};
	return (
		<div ref={rootRef}>
			<WorkflowStepComponentPanel
				{...props}
				stockStatusSlot={stockStatusSlot}
				onOpenInventory={
					canOpenInventory
						? (component, trigger) =>
								showInventory(String(component.uid), trigger)
						: undefined
				}
				stockManagementSlot={
					<>
						{canOpenInventory ? (
							<Menu.Item
								Icon={Package}
								onClick={() =>
									showInventory(
										null,
										rootRef.current?.querySelector<HTMLElement>(
											'[aria-label="More step options"]',
										) ?? undefined,
									)
								}
							>
								Inventory overview
							</Menu.Item>
						) : null}
						{auth.can.editInboundOrder ? (
							<Menu.Item
								onClick={() =>
									setParams({
										stockOperation: "adjust",
										stockInventoryId: null,
										stockVariantId: null,
										stockLocationId: null,
									})
								}
							>
								Adjust stock
							</Menu.Item>
						) : null}
						{stepId ? (
							<Menu.Item onClick={() => setOpen(true)}>
								Stock management
							</Menu.Item>
						) : null}
					</>
				}
			/>
			{open && stepId ? (
				<StockPolicyDialog
					selector={{ stepId }}
					open={open}
					onOpenChange={setOpen}
				/>
			) : null}
			{inventory && stepId ? (
				<WorkflowStockSheet
					key={`${props.lineUid}:${stepId}`}
					stepId={stepId}
					stepTitle={props.activeStep.step?.title || "Components"}
					components={[...catalog.values()]}
					initialUid={inventory.uid}
					onClose={() => {
						const trigger = inventory.trigger;
						setInventory(null);
						requestAnimationFrame(() => {
							if (trigger?.isConnected) trigger.focus();
							else
								rootRef.current
									?.querySelector<HTMLElement>(
										'[aria-label="More step options"]',
									)
									?.focus();
						});
					}}
				/>
			) : null}
		</div>
	);
}
