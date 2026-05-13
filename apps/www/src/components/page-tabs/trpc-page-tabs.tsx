"use client";

import { usePathname } from "next/navigation";
import { PageTabs } from "./page-tabs";

export function SalesBookPageTabs() {
	return <CurrentPageTabs />;
}

export function DealersPageTabs() {
	return <CurrentPageTabs />;
}

export function SalesDashboardPageTabs() {
	return <CurrentPageTabs />;
}

function CurrentPageTabs() {
	const pathname = usePathname();

	return <PageTabs page={pathname} portal />;
}
