"use client";

import { useCustomerOverviewParams } from "@/hooks/use-customer-overview-params";
import { CustomSheet } from "@gnd/ui/custom/sheet";
import { CustomerOverviewWorkspace } from "./customer-overview-workspace";

export function CustomerOverviewSheet() {
	const overview = useCustomerOverviewParams();
	const customerId = overview.customerId;

	if (!overview.opened || !customerId) return null;

	return (
		<CustomSheet
			floating
			onOpenChange={(open) => {
				if (!open) overview.close();
			}}
			open={overview.opened}
			rounded
			sheetName="dealer-customer-overview"
			size="4xl"
		>
			<CustomerOverviewWorkspace
				activeTab={overview.activeTab}
				customerId={customerId}
				onTabChange={overview.setTab}
				surface="sheet"
			/>
		</CustomSheet>
	);
}
