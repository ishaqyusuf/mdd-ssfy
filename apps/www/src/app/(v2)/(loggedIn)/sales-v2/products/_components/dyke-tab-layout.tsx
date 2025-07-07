"use client";

import TabbedLayout from "@/components/_v1/tab-layouts/tabbed-layout";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function DykeTabLayout({ children }) {
    const { data: session } = useSession({
        required: false,
    });
    const can = session?.can;
    const [tabs, setTabs] = useState([
        { title: "Door Components", path: "/sales-v2/products" },
        { title: "Shelf Items", path: "/sales-v2/products/shelf-items" },
        { title: "Doors", path: "/sales-v2/products/doors" },
    ]);
    return <TabbedLayout tabs={tabs}>{children}</TabbedLayout>;
}
