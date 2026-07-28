"use client";

import { CustomSheet, CustomSheetContent } from "@/components/sheets/custom-sheet-content";
import { useCustomerOverviewV2SheetQuery } from "@/hooks/use-customer-overview-v2-sheet-query";
import { SheetDescription, SheetHeader, SheetTitle } from "@gnd/ui/sheet";

import { CustomerOverviewV2Content } from "./customer-overview-v2-content";

export function CustomerOverviewV2Sheet() {
	const query = useCustomerOverviewV2SheetQuery();
	const accountNo = query.params.customerOverviewV2AccountNo;

	if (!query.opened || !accountNo) return null;

	return (
		<CustomSheet
			floating
			onOpenChange={(open) => {
				if (!open) query.close();
			}}
			open={query.opened}
			rounded
			sheetName="customer-overview-v2-sheet"
			size="3xl"
		>
			<SheetHeader>
				<SheetTitle>Customer Overview V2</SheetTitle>
				<SheetDescription>
					Customer detail workspace with wallet, reminders, payments, and sales history.
				</SheetDescription>
			</SheetHeader>
			<CustomSheetContent className="pt-2">
				<CustomerOverviewV2Content
					accountNo={accountNo}
					defaultTab={query.params.customerOverviewV2Tab || "overview"}
				/>
			</CustomSheetContent>
		</CustomSheet>
	);
}
