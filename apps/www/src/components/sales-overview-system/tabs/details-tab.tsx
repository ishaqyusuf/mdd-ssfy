"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";

import { useSalesOverviewSystem } from "../provider";

export function SalesOverviewDetailsTab() {
	const { data } = useSalesOverviewSystem();

	return (
		<Card>
			<CardHeader>
				<CardTitle>Reference Data</CardTitle>
			</CardHeader>
			<CardContent>
				<pre className="overflow-x-auto rounded-xl bg-muted/40 p-4 text-xs">
					{JSON.stringify(
						{
							id: data?.id,
							orderId: data?.orderId,
							customerId: data?.customerId,
							type: data?.type,
							salesRep: data?.salesRep,
							status: data?.status,
							stats: data?.stats,
							invoice: data?.invoice,
						},
						null,
						2,
					)}
				</pre>
			</CardContent>
		</Card>
	);
}
