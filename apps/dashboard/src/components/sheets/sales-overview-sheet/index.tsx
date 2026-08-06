"use client";

import { getSalesOverviewDocumentStatus } from "@/components/sales-overview-system/lib/document-status";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import Sheet from "@gnd/ui/custom/sheet-v2";
import { Tabs } from "@gnd/ui/tabs";
import { useEffect, useRef, useState } from "react";

import { SalesOverviewProvider, useSaleOverview } from "./context";
import {
	createLegacySalesOverviewTabs,
	resolveLegacySalesOverviewActiveTab,
	resolveLegacySalesOverviewMode,
} from "./controller";
import { CustomerEditPane } from "./customer-edit-pane";
import { InboundCreatePane } from "./inbound-create-pane";
import { InboundDetailPane } from "./inbound-detail-pane";
import { LegacySalesOverviewHeader, LegacySalesOverviewPanels } from "./layout";
import {
	SalesAddressPane,
	type SalesAddressPaneSelection,
} from "./sales-address-pane";
import type { LegacySalesOverviewTabId } from "./types";

type SalesOverviewPane =
	| { kind: "customer" }
	| ({ kind: "address" } & SalesAddressPaneSelection)
	| { kind: "inbound-create" }
	| { kind: "inbound-detail"; inboundId: number };

export default function SalesOverviewSheet() {
	const query = useSalesOverviewQuery();

	return query["sales-overview-id"] ? <Modal /> : null;
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
	const { data } = useSaleOverview();
	const [pane, setPane] = useState<SalesOverviewPane | null>(null);
	const [paneOpened, setPaneOpened] = useState(false);
	const paneTriggerRef = useRef<HTMLElement | null>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: changing sales must discard any open secondary pane
	useEffect(() => {
		setPane(null);
		setPaneOpened(false);
		paneTriggerRef.current = null;
	}, [data?.id]);
	const rememberPaneTrigger = () => {
		paneTriggerRef.current =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
	};
	const openAddressPane = (selection: SalesAddressPaneSelection) => {
		rememberPaneTrigger();
		setPane({ kind: "address", ...selection });
		setPaneOpened(true);
	};
	const openCustomerPane = () => {
		rememberPaneTrigger();
		setPane({ kind: "customer" });
		setPaneOpened(true);
	};
	const openInboundCreatePane = () => {
		rememberPaneTrigger();
		setPane({ kind: "inbound-create" });
		setPaneOpened(true);
	};
	const openInboundDetailPane = (inboundId: number) => {
		if (!paneOpened) rememberPaneTrigger();
		setPane({ kind: "inbound-detail", inboundId });
		setPaneOpened(true);
	};
	const closePane = () => {
		setPaneOpened(false);
	};
	const handlePaneExited = () => {
		setPane(null);
		const trigger = paneTriggerRef.current;
		paneTriggerRef.current = null;
		requestAnimationFrame(() => trigger?.focus());
	};
	const isQuote =
		data?.type === "quote" || query.params["sales-type"] === "quote";
	const addressEditingLocked =
		data != null && getSalesOverviewDocumentStatus(data).status === "fulfilled";
	const mode = resolveLegacySalesOverviewMode({
		assignedTo: query.assignedTo,
		requestedMode: query.params.mode,
		viewMode: query.viewMode,
	});
	const tabs = createLegacySalesOverviewTabs({
		mode,
		isQuote,
		prodQty: 0,
		saleId: data?.id,
		orderId: data?.orderId,
		onEditAddress: openAddressPane,
		onEditCustomer: openCustomerPane,
		onCreateInbound: openInboundCreatePane,
		onViewInbound: openInboundDetailPane,
	});
	const activeTab = resolveLegacySalesOverviewActiveTab({
		currentTab: query?.params?.salesTab,
		tabs,
	});
	const setActiveTab = (tab: LegacySalesOverviewTabId) => {
		query.setParams({
			salesTab: tab as never,
			"prod-item-tab": null,
			"prod-item-view": null,
			dispatchOverviewId: null,
		});
	};

	return (
		<Sheet
			sheetName="sales-overview-sheet"
			open
			onOpenChange={query.close}
			primarySize="2xl"
			secondarySize="2xl"
			secondaryOpened={paneOpened}
			onCloseSecondary={closePane}
			onSecondaryExited={handlePaneExited}
		>
			<Sheet.MultiContent>
				<Sheet.PrimaryContent>
					<Tabs
						value={activeTab}
						onValueChange={(e) => {
							setActiveTab(e as LegacySalesOverviewTabId);
						}}
					>
						<LegacySalesOverviewHeader
							tabs={tabs}
							activeTab={activeTab as LegacySalesOverviewTabId}
							onTabChange={setActiveTab}
						/>
					</Tabs>
					<Sheet.Content className="-mt-4">
						<Tabs value={activeTab}>
							<LegacySalesOverviewPanels activeTab={activeTab} tabs={tabs} />
						</Tabs>
					</Sheet.Content>
				</Sheet.PrimaryContent>
				{pane?.kind === "address" && data?.id && data.customerId ? (
					<SalesAddressPane
						key={`${pane.addressType}-${pane.addressId ?? "new"}`}
						selection={pane}
						billingAddressId={data.addressData?.billing?.id}
						customerId={data.customerId}
						salesId={data.id}
						onClose={closePane}
					/>
				) : null}
				{pane?.kind === "customer" && data?.id && data.customerId ? (
					<CustomerEditPane
						key={`customer-${data.id}`}
						addressEditingLocked={addressEditingLocked}
						billingAddressId={data.addressData?.billing?.id}
						customerId={data.customerId}
						onClose={closePane}
						salesId={data.id}
						salesType={isQuote ? "quote" : "order"}
						shippingAddressId={data.addressData?.shipping?.id}
					/>
				) : null}
				{pane?.kind === "inbound-create" && data?.id && data.orderId ? (
					<InboundCreatePane
						key={`inbound-create-${data.id}`}
						salesOrderId={data.id}
						orderNumber={data.orderId}
						onClose={closePane}
						onCreated={openInboundDetailPane}
					/>
				) : null}
				{pane?.kind === "inbound-detail" ? (
					<InboundDetailPane
						key={`inbound-${pane.inboundId}`}
						inboundId={pane.inboundId}
					/>
				) : null}
			</Sheet.MultiContent>
		</Sheet>
	);
}
