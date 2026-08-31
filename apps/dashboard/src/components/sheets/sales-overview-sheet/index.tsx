"use client";

import { getSalesOverviewDocumentStatus } from "@/components/sales-overview-system/lib/document-status";
import {
    inventoryCreateInboundParamForClose,
    inventoryCreateInboundParamForOpen,
} from "@/components/sales-overview-system/lib/inbound-create-continuation";
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
import { PaymentCreatePane } from "./payment-create-pane";
import {
    SalesAddressPane,
    type SalesAddressPaneSelection,
} from "./sales-address-pane";
import { buildLegacySalesOverviewTabNavigation } from "./tab-navigation";
import { PaymentTransactionPane } from "./transactions-tab";
import type { LegacySalesOverviewTabId } from "./types";

type SalesOverviewPane =
    | { kind: "customer" }
    | ({ kind: "address" } & SalesAddressPaneSelection)
    | { kind: "inbound-create"; mode?: "create_inbound" | "mark_available" }
    | { kind: "inbound-detail"; inboundId: number }
    | { kind: "payment-create" }
    | { kind: "payment"; transactionId: string }
    | { kind: "packing" };

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
    const openInboundCreatePane = (
        mode: "create_inbound" | "mark_available" = "create_inbound",
    ) => {
        if (
            pane?.kind === "inbound-create" &&
            pane.mode === mode &&
            paneOpened
        ) {
            return;
        }
        if (!paneOpened) rememberPaneTrigger();
        setPane({ kind: "inbound-create", mode });
        setPaneOpened(true);
        query.setParams({
            inventoryCreateInbound: inventoryCreateInboundParamForOpen(mode),
        });
    };
    const openInboundDetailPane = (inboundId: number) => {
        if (!paneOpened) rememberPaneTrigger();
        setPane({ kind: "inbound-detail", inboundId });
        setPaneOpened(true);
    };
    const openPaymentPane = (transactionId: string) => {
        if (!paneOpened) rememberPaneTrigger();
        setPane({ kind: "payment", transactionId });
        setPaneOpened(true);
        query.setParams({
            salesPayment: null,
            salesTransaction: transactionId,
            salesRefund: null,
        });
    };
    const openPaymentCreatePane = () => {
        if (!paneOpened) rememberPaneTrigger();
        setPane({ kind: "payment-create" });
        setPaneOpened(true);
        query.setParams({
            salesPayment: "new",
            salesTransaction: null,
            salesRefund: null,
        });
    };
    const closePane = () => {
        if (query.salesRefund) {
            query.setParams({ salesRefund: null });
            return;
        }
        setPaneOpened(false);
        const inventoryCreateInbound = inventoryCreateInboundParamForClose(
            pane?.kind,
        );
        if (inventoryCreateInbound !== undefined) {
            query.setParams({ inventoryCreateInbound });
        }
        if (pane?.kind === "payment-create" || query.salesPayment) {
            query.setParams({ salesPayment: null });
            return;
        }
        if (pane?.kind === "payment") {
            query.setParams({
                salesTab: "transactions",
                salesTransaction: null,
                salesRefund: null,
            });
        }
    };
    const handleInboundCreated = (inboundId: number) => {
        query.setParams({ inventoryCreateInbound: null });
        openInboundDetailPane(inboundId);
    };
    const setPackItemsOpen = (open: boolean) => {
        if (!open) {
            closePane();
            return;
        }
        rememberPaneTrigger();
        setPane({ kind: "packing" });
        setPaneOpened(true);
    };
    const handlePaneExited = () => {
        setPane(null);
        const trigger = paneTriggerRef.current;
        paneTriggerRef.current = null;
        requestAnimationFrame(() => trigger?.focus());
    };
    useEffect(() => {
        if (query.salesPayment === "new") {
            setPane((current) =>
                current?.kind === "payment-create"
                    ? current
                    : { kind: "payment-create" },
            );
            setPaneOpened(true);
            return;
        }
        if (query.salesTransaction) {
            setPane((current) =>
                current?.kind === "payment" &&
                current.transactionId === query.salesTransaction
                    ? current
                    : {
                          kind: "payment",
                          transactionId: query.salesTransaction,
                      },
            );
            setPaneOpened(true);
            return;
        }
        if (pane?.kind === "payment" || pane?.kind === "payment-create") {
            setPaneOpened(false);
        }
    }, [pane?.kind, query.salesPayment, query.salesTransaction]);
    const isQuote =
        data?.type === "quote" || query.params["sales-type"] === "quote";
    const addressEditingLocked =
        data != null &&
        getSalesOverviewDocumentStatus(data).status === "fulfilled";
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
        inboundCreateOpen: pane?.kind === "inbound-create",
        onViewPayment: openPaymentPane,
        onCreatePayment: openPaymentCreatePane,
        packItemsOpen: pane?.kind === "packing",
        onPackItemsOpenChange: setPackItemsOpen,
    });
    const activeTab = resolveLegacySalesOverviewActiveTab({
        currentTab: query?.params?.salesTab,
        tabs,
    });
    const isGeneralV2 =
        activeTab === "general" &&
        (data as { generalViewVersion?: "v1" | "v2" } | undefined)
            ?.generalViewVersion === "v2";
    const setActiveTab = (tab: LegacySalesOverviewTabId) => {
        const navigation = buildLegacySalesOverviewTabNavigation(
            tab,
            pane?.kind,
        );
        if (navigation.closePackingPane) closePane();
        query.setParams({ ...navigation.params, salesTab: tab as never });
    };

    return (
        <Sheet
            sheetName="sales-overview-sheet"
            open
            onOpenAutoFocus={(event) => {
                event.preventDefault();
                window.requestAnimationFrame(() => {
                    const targets = document.querySelectorAll<HTMLElement>(
                        "#custom-sheet-sales-overview-sheet [data-sales-overview-initial-focus]",
                    );
                    for (const target of targets) {
                        if (target.offsetParent !== null) {
                            target.focus();
                            break;
                        }
                    }
                });
            }}
            onOpenChange={query.close}
            primarySize="3xl"
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
                    <Sheet.Content
                        key={activeTab}
                        contentClassName={
                            isGeneralV2 ? "pb-0 sm:pb-0" : undefined
                        }
                    >
                        <Tabs value={activeTab}>
                            <LegacySalesOverviewPanels
                                activeTab={activeTab}
                                tabs={tabs}
                            />
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
                        key={`inbound-create-${data.id}-${pane.mode || "create_inbound"}`}
                        salesOrderId={data.id}
                        orderNumber={data.orderId}
                        mode={pane.mode || "create_inbound"}
                        onClose={closePane}
                        onCreated={handleInboundCreated}
                    />
                ) : null}
                {pane?.kind === "inbound-detail" ? (
                    <InboundDetailPane
                        key={`inbound-${pane.inboundId}`}
                        inboundId={pane.inboundId}
                    />
                ) : null}
                {pane?.kind === "payment" && data?.orderId ? (
                    <PaymentTransactionPane
                        key={`payment-${pane.transactionId}`}
                        salesId={data.orderId}
                        transactionId={pane.transactionId}
                        onClose={closePane}
                    />
                ) : null}
                {pane?.kind === "payment-create" && data?.id && data.orderId ? (
                    <PaymentCreatePane
                        key={`payment-create-${data.id}`}
                        customerId={data.customerId}
                        customerPhone={data.customerPhone}
                        onClose={closePane}
                        orderNo={data.orderId}
                        salesId={data.id}
                    />
                ) : null}
            </Sheet.MultiContent>
        </Sheet>
    );
}
