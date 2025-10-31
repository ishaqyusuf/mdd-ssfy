"use client";

import { useTab } from "@/_v2/components/tab-layout/tab-hook";
import TabbedLayout from "@/components/_v1/tab-layouts/tabbed-layout";
import { useEffect } from "react";

export default function SalesTab() {
    const tab = useTab();
    useEffect(() => {
        tab.reset();
        tab.registerTab("Orders", "/sales/orders");
        // tab.registerTab(
        //     "Back Orders",
        //     "/sales/back-orders",
        //     tab.can("viewOrders")
        // );
        tab.registerTab("Quotes", "/sales/quotes");
        tab.registerTab(
            "Delivery",
            "/sales/dispatch/delivery",
            tab.can("viewDelivery")
        );
        tab.registerTab(
            "Pickup",
            "/sales/dispatch/pickup",
            tab.can("viewDelivery")
        );
    }, []);
    return <TabbedLayout tabs={tab.tabs} />;
}
