"use client";

import TabbedLayout from "@/components/_v1/tab-layouts/tabbed-layout";
import { useAuth } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";

export default function SalesTab() {
	const permission = usePermission();
	const auth = useAuth();
	const canViewPackingList =
		permission.can("viewPacking") && auth.roleTitle === "Super Admin";

	const tabs = [
		{ title: "Orders", path: "/sales/orders" },
		{ title: "Quotes", path: "/sales/quotes" },
		...(permission.can("viewDelivery")
			? [
					{
						title: "Delivery",
						path: "/sales/dispatch/delivery",
					},
					{
						title: "Pickup",
						path: "/sales/dispatch/pickup",
					},
				]
			: []),
		...(canViewPackingList
			? [
					{
						title: "Packing List",
						path: "/sales/packing-list",
					},
				]
			: []),
	];

	return <TabbedLayout tabs={tabs} />;
}
