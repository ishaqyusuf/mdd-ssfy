"use client";

import { useInventoryInboundFilterParams } from "@/hooks/use-inventory-inbound-filter-params";

import { GeneralInboundSheet } from "@/components/sheets/general-inbound-sheet";

import { DataTable } from "@/components/tables-2/inventory-inbounds/data-table";

import type { TableSettings } from "@/utils/table-settings";

import { Button } from "@gnd/ui/button";
import { InventoryInboundHeader } from "./inventory-inbound-header";

import { InboundReceivingQueue } from "@/components/sheets/inbound-demand-queue-sheet";
import { InboundReceivingDetail } from "@/components/sheets/inbound-receiving-sheet";
import {
	InboundReceivingProvider,
	useInboundReceiving,
} from "./inbound-receiving-context";
type Props = { initialSettings?: Partial<TableSettings> };
export function InboundReceivingPage(props: Props) {
	return (
		<InboundReceivingProvider>
			<InboundReceivingWorkspace {...props} />
		</InboundReceivingProvider>
	);
}
function InboundReceivingWorkspace({ initialSettings }: Props) {
	const { shipments, shipmentsQuery, selectedInboundId, setSelectedInboundId } =
		useInboundReceiving();
	const { filters } = useInventoryInboundFilterParams();
	return (
		<div className="flex flex-col gap-6">
			<InventoryInboundHeader />
			{shipmentsQuery.isError ? (
				<div role="alert">
					<p>{shipmentsQuery.error.message}</p>
					<Button variant="outline" onClick={() => shipmentsQuery.refetch()}>
						Retry
					</Button>
				</div>
			) : (
				<DataTable
					data={shipments}
					initialSettings={initialSettings}
					isLoading={shipmentsQuery.isLoading}
					selectedInboundId={selectedInboundId}
					onSelectInbound={setSelectedInboundId}
					hasNextPage={shipmentsQuery.hasNextPage}
					isFetchingNextPage={shipmentsQuery.isFetchingNextPage}
					fetchNextPage={() => shipmentsQuery.fetchNextPage()}
					hasFilters={Boolean(filters.inboundSearch || filters.inboundStatus)}
				/>
			)}
			<InboundReceivingDetail />
			<InboundReceivingQueue />
			<GeneralInboundSheet />
		</div>
	);
}
