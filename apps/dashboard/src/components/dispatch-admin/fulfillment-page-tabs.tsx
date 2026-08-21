"use client";

import { fulfillmentPageTabs } from "@/components/dispatch-admin/fulfillment-tabs";
import { PageTabs } from "@/components/page-tabs";

export function FulfillmentPageTabs() {
	return (
		<PageTabs
			portal={false}
			tabs={fulfillmentPageTabs}
			allTitle="Pending"
			allActiveParam={{ key: "tab", value: "pending" }}
			maxVisible={{ base: 4, lg: 4, "2xl": 4 }}
		/>
	);
}
