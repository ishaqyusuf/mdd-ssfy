import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { cn } from "@/lib/utils";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@gnd/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { useSalesOverview } from "./hook";
import { salesOverviewStore, SalesTabs, salesTabs } from "./store";
import { ProductionNoteTab } from "./tabs/prod-note-tab";
import { SalesInfoTab } from "./tabs/sales-info-tab";
import { SalesItemsTab } from "./tabs/sales-items-tab";
import { SalesNoteTab } from "./tabs/sales-note-tab";
import { SalesShippingForm } from "./tabs/sales-shipping-form";
import { SalesShippingOverview } from "./tabs/sales-shipping-overview";
import { SalesShippingTab } from "./tabs/sales-shipping-tab";
import { TransactionHistoryTab } from "./tabs/transaction-history-tab";

interface OpenSalesOverviewProps {
    salesId;
    shippingId?;
}
export function openQuoteOVerview(props: OpenSalesOverviewProps) {
    salesOverviewStore.getState().reset({
        salesId: props.salesId,
        tabs: salesTabs.quotes,
        showTabs: true,
        // currentTab: "sales_info",
        showFooter: true,
        adminMode: true,
    });
    _modal.openSheet(<SalesOverviewModal />);
}
export function openSalesOverview(props: OpenSalesOverviewProps) {
    salesOverviewStore.getState().reset({
        salesId: props.salesId,
        tabs: salesTabs.admin,
        showTabs: true,
        // currentTab: "sales_info",
        showFooter: true,
        adminMode: true,
    });
    _modal.openSheet(<SalesOverviewModal />);
}

interface Props {}
export default function SalesOverviewModal({}: Props) {
    useSalesOverview();
    return (
        <Modal.MultiPane>
            <Modal.Pane>
                <PrimaryTab />
            </Modal.Pane>
        </Modal.MultiPane>
    );
}
function PrimaryTab({}) {
    const store = salesOverviewStore();
    // className = "w-[600px] flex flex-col side-modal-rounded-h-content";
    return (
        <>
            <Modal.Header
                className="max-sm:p-4"
                title={
                    <span className="uppercase">
                        {store?.overview?.title || "Loading..."}
                    </span>
                }
                subtitle={store?.overview?.subtitle}
            />
            <Tabs
                value={store.currentTab}
                onValueChange={(e) => {
                    store.update("currentTab", e as any);
                }}
                className=""
            >
                <div className="flex justify-end md:hidden">
                    <Select
                        value={store.currentTab}
                        onValueChange={(e) => {
                            store.update("currentTab", e as any);
                        }}
                    >
                        <SelectTrigger className="w-1/2 space-x-1 font-medium">
                            <span className="uppercase">
                                {
                                    store.tabs?.find(
                                        (s) => s.name == store.currentTab,
                                    )?.label
                                }
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            {store.tabs?.map((tab) => (
                                <SelectItem
                                    className={cn(
                                        "uppercase",
                                        !tab.show && "hidden",
                                    )}
                                    key={tab.name}
                                    value={tab.name}
                                >
                                    {tab.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <TabsList
                    className={cn(
                        "hidden w-full md:block",
                        !store.showTabs && "hidden md:hidden",
                    )}
                >
                    {store.tabs?.map((tab) => (
                        <TabsTrigger
                            className={cn("uppercase", !tab.show && "hidden")}
                            key={tab.name}
                            value={tab.name}
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
            <div id="tabHeader"></div>
            <Modal.ScrollArea className="my-2">
                <TabContent tabName="sales_info">
                    <SalesInfoTab />
                </TabContent>
                <TabContent tabName="items">
                    <SalesItemsTab />
                </TabContent>
                {/* <TabContent tabName="productions">
                    <SalesItemsTab productionMode />
                </TabContent> */}
                <TabContent tabName="shipping">
                    <SalesShippingTab />
                </TabContent>
                <TabContent tabName="shipping_form">
                    <SalesShippingForm />
                </TabContent>
                <TabContent tabName="shipping_overview">
                    <SalesShippingOverview />
                </TabContent>
                <TabContent tabName="production_note">
                    <ProductionNoteTab />
                </TabContent>
                <TabContent tabName="notification">
                    <SalesNoteTab />
                </TabContent>
                <TabContent tabName="transactions">
                    <TransactionHistoryTab />
                </TabContent>
            </Modal.ScrollArea>
        </>
    );
}

function TabContent({ children, tabName }: { children?; tabName: SalesTabs }) {
    const store = salesOverviewStore();
    return store.currentTab == tabName ? children : null;
}
function SecondaryTab({}) {
    return (
        <div className="side-modal-rounded-h-content flex flex-col sm:w-[600px]">
            <Modal.Header title="Title" subtitle={"LOREM IPSUM"} />
            <Modal.ScrollArea>
                <div className="min-h-screen">abc</div>
            </Modal.ScrollArea>
            <Modal.Footer>
                <div className="abc flex-1 border-t p-4">a</div>
            </Modal.Footer>
        </div>
    );
}
