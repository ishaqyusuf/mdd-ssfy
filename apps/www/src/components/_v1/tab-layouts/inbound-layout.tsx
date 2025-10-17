"use client";

import { useEffect, useState } from "react";
import TabbedLayout from "./tabbed-layout";

export default function InboundLayout({ children }: { children }) {
    const [tabs, setTabs] = useState([
        // { title: "Inbound Orders", path: "/sales/inbounds" },
        // { title: "Putaway", path: "/sales/inbounds/putaway" },
    ]);
    return <TabbedLayout tabs={tabs}>{children}</TabbedLayout>;
}
