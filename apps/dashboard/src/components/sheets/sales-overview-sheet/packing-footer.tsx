"use client";

import { SalesMenu } from "@/components/sales-menu";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { Button } from "@gnd/ui/button";
import Sheet from "@gnd/ui/custom/sheet-v2";
import { SheetFooter } from "@gnd/ui/sheet";

import { useSaleOverview } from "./context";

export function PackingFooter() {
	const { data } = useSaleOverview();
	const query = useSalesOverviewQuery();
	const salesPreview = useSalesPreview();
	const dispatchId = query.params.dispatchId;

	const previewPackingList = () => {
		void salesPreview.preview(data?.id, data?.type, {
			mode: "packing list",
			dispatchId: query.params.dispatchId,
			customerEmail: data?.email,
			customerName: data?.displayName,
		});
	};

	return (
		<Sheet.Portal>
			<SheetFooter className="flex-row justify-end gap-2 border-t bg-background p-4 md:p-6">
				<Button
					type="button"
					size="sm"
					disabled={!data?.id || !dispatchId}
					onClick={previewPackingList}
				>
					Preview
				</Button>
				<SalesMenu
					id={data?.id}
					slug={data?.uuid}
					type={data?.type}
					orderNo={data?.orderId}
					customerId={data?.customerId}
					customerEmail={data?.email ?? null}
					customerPhone={data?.customerPhone}
					customerName={data?.displayName}
				>
					<SalesMenu.Share />
					<SalesMenu.SalesPrintMenuItems />
					<SalesMenu.SalesEmailMenuItems />
				</SalesMenu>
			</SheetFooter>
		</Sheet.Portal>
	);
}
