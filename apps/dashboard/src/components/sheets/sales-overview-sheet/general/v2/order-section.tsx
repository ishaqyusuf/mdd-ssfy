"use client";

import {
	InventoryInboundStatusBadge,
	SalesInboundStatusBadge,
	getSingleInventoryInboundId,
} from "@/components/sales-inbound-status-badge";
import { useSalesInventorySegmentQuery } from "@/components/sales-overview-system/hooks/use-sales-inventory-segment-query";
import { SalesRepTransferControl } from "@/components/sales-rep-transfer-control";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import type { ComponentProps } from "react";
import { SalesPO } from "../../inline-data-edit";
import { DeliveryOptionPopover } from "./delivery-option-popover";
import { SectionHeading } from "./section-heading";
import type { SalesOverviewData } from "./types";

function Fact({
	label,
	children,
	wide = false,
}: {
	label: string;
	children: React.ReactNode;
	wide?: boolean;
}) {
	return (
		<div className={wide ? "col-span-full" : undefined}>
			<dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</dt>
			<dd className="mt-1 min-w-0 text-sm font-medium">{children}</dd>
		</div>
	);
}

export function OrderSection({ data }: { data: SalesOverviewData }) {
	const isQuote = data.type === "quote";
	const query = useSalesOverviewQuery();
	const { setInventorySegment } = useSalesInventorySegmentQuery();
	type InboundOwnership = ComponentProps<
		typeof InventoryInboundStatusBadge
	>["ownership"];
	const inventoryInboundOwnership = data.inventoryInboundOwnership as
		| InboundOwnership
		| undefined;
	const hasInventoryInbound = Boolean(
		inventoryInboundOwnership?.hasInventoryInbound,
	);
	const inventoryInboundId = getSingleInventoryInboundId(
		inventoryInboundOwnership,
	);
	const openInventoryInbound = () => {
		setInventorySegment("inbounds", { inboundId: inventoryInboundId });
		query.setParams({ salesTab: "inventory" });
	};

	return (
		<section className="flex flex-col gap-4" aria-labelledby="general-v2-order">
			<SectionHeading
				id="general-v2-order"
				icon={Icons.FileText}
				title={isQuote ? "Quote details" : "Order details"}
			/>
			<dl className="grid grid-cols-2 gap-x-5 gap-y-4">
				<Fact label={isQuote ? "Quote number" : "Order number"}>
					{data.orderId}
				</Fact>
				<Fact label="Age">{data.salesDate || "—"}</Fact>
				<Fact label="Type">
					<span className="capitalize">{data.type}</span>
				</Fact>
				{!isQuote ? (
					<Fact label="Inbound status">
						<div className="flex flex-col items-start gap-1">
							{hasInventoryInbound ? (
								<InventoryInboundStatusBadge
									ownership={inventoryInboundOwnership}
								/>
							) : (
								<SalesInboundStatusBadge
									status={data.inboundStatus}
									emptyFallback="No status"
									title="Manual order status"
								/>
							)}
							{hasInventoryInbound ? (
								<Button
									type="button"
									variant="link"
									size="xs"
									className="px-0"
									onClick={openInventoryInbound}
								>
									Open inbounds
									<Icons.ExternalLink data-icon="inline-end" />
								</Button>
							) : null}
						</div>
					</Fact>
				) : (
					<Fact label="Status">
						<Badge variant="outline">Quote</Badge>
					</Fact>
				)}
				<Fact label="P.O. number">
					<SalesPO
						salesId={data.id}
						value={data.poNo}
						salesType={isQuote ? "quote" : "order"}
						showLabel={false}
						compact
					/>
				</Fact>
				<Fact label="Sales representative">
					<div className="flex flex-col items-start gap-1">
						<span>
							{data.salesRep || "Unassigned"}
							{data.salesRepInitial ? ` (${data.salesRepInitial})` : ""}
						</span>
						<SalesRepTransferControl sale={data} presentation="popover" />
					</div>
				</Fact>
				{!isQuote ? (
					<Fact label="Delivery option" wide>
						<DeliveryOptionPopover
							salesId={data.id}
							salesOrderNo={data.orderId}
							salesType="order"
							fallbackMode={data.deliveryOption}
							fallbackDeliveryId={data.deliverySummary?.id}
							fallbackFulfillmentDate={data.deliverySummary?.fulfillmentDate}
						/>
					</Fact>
				) : null}
			</dl>
		</section>
	);
}
