"use client";

import { SalesMenu } from "@/components/sales-menu";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import type { FulfillmentOrder } from "./columns";
import { useSalesDispatchTableStore } from "../sales-dispatch/store";

export function BottomBar({ data }: { data: FulfillmentOrder[] }) {
	const { rowSelection, setRowSelection } = useSalesDispatchTableStore();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const selected = data.filter((order) => rowSelection[String(order.id)]);
	if (!selected.length) return null;
	return (
		<div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
			<span className="whitespace-nowrap text-sm">
				{selected.length} orders selected
			</span>
			<Button variant="ghost" onClick={() => setRowSelection({})}>
				Deselect all
			</Button>
			<SalesMenu
				type="order"
				salesIds={selected.map((order) => order.id)}
				salesRefs={selected.map((order) => ({
					salesId: order.id,
					orderNo: order.orderNo,
					salesType: "order" as const,
				}))}
				trigger={<Button variant="outline">Mark as</Button>}
			>
				<SalesMenu.MarkAs
					asSubmenu={false}
					statusCandidates={selected.map((order) => ({
						salesId: order.id,
						status: order.pipeline.headline.code,
						pipeline: order.pipeline,
						pipelineRevision: order.pipeline.revision,
					}))}
					onStatusActionSettled={() => {
						setRowSelection({});
						void queryClient.invalidateQueries({
							queryKey: trpc.dispatch.fulfillmentOrders.pathKey(),
						});
					}}
				/>
			</SalesMenu>
		</div>
	);
}
