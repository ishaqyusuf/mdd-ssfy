"use client";

import { SalesOverviewInbox } from "@/components/chat";

import { useSalesOverviewSystem } from "../../provider";

export function SalesOverviewActivityTabV1() {
	const {
		state: { data },
	} = useSalesOverviewSystem();

	return (
		<div className="p-1">
			<SalesOverviewInbox
				saleData={{
					id: data?.id,
					orderId: data?.orderId,
				}}
				variant="activity"
			/>
		</div>
	);
}
