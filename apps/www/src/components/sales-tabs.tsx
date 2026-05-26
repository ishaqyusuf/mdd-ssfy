"use client";

import { useAuth } from "@/hooks/use-auth";
import { HeaderTab } from "@gnd/ui/header-tab";
import { _perm, validateRules, type Access } from "./sidebar-links";

const salesTabs: {
    href: string;
    label: string;
    icon: string;
    rules: Access[];
}[] = [
    {
        href: "/sales-book/orders",
        label: "Orders",
        icon: "orders",
        rules: [_perm.is("editOrders")],
    },
    {
        href: "/sales-book/quotes",
        label: "Quotes",
        icon: "quotes",
        rules: [_perm.is("viewEstimates")],
    },
    {
        href: "/sales-book/productions",
        label: "Production",
        icon: "production",
        rules: [_perm.is("editOrders")],
    },
    {
        href: "/sales-book/shelf-items",
        label: "Shelf Items",
        icon: "products",
        rules: [_perm.is("editOrders")],
    },
];

export function SalesTabs() {
    const auth = useAuth();

    if (!auth.enabled || auth.isPending) return null;

    const visibleTabs = salesTabs.filter((tab) =>
        validateRules(tab.rules, auth.can, auth.id, auth.role),
    );

    if (!visibleTabs.length) return null;

    return (
        <HeaderTab aria-label="Sales sections">
            {visibleTabs.map((tab) => (
                <HeaderTab.Tab
                    key={tab.href}
                    href={tab.href}
                    label={tab.label}
                    icon={tab.icon}
                />
            ))}
        </HeaderTab>
    );
}
