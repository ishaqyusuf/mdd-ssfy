"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";

import { useSalesOverviewSystem } from "../provider";
import { formatCurrency, getPaymentBalance } from "../view-model";

export function SalesOverviewFinanceTab() {
	const { data } = useSalesOverviewSystem();
	const total = Number(data?.invoice?.total || 0);
	const paid = Number(data?.invoice?.paid || 0);
	const balance = getPaymentBalance(data?.invoice);

	return (
		<div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
			<Card>
				<CardHeader>
					<CardTitle>Payment Summary</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-xl bg-muted/40 p-4">
						<p className="text-sm text-muted-foreground">Invoice Total</p>
						<p className="text-2xl font-semibold">{formatCurrency(total)}</p>
					</div>
					<div className="rounded-xl bg-muted/40 p-4">
						<p className="text-sm text-muted-foreground">Collected</p>
						<p className="text-2xl font-semibold">{formatCurrency(paid)}</p>
					</div>
					<div className="rounded-xl bg-muted/40 p-4">
						<p className="text-sm text-muted-foreground">Balance</p>
						<p className="text-2xl font-semibold">{formatCurrency(balance)}</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Cost Lines</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{data?.costLines?.length ? (
						data.costLines.map((line, index) => (
							<div
								key={`${line?.title || "line"}-${line?.value || line?.amount || 0}-${index}`}
								className="flex items-center justify-between rounded-xl border p-4"
							>
								<div>
									<p className="font-medium">
										{line?.title || `Line ${index + 1}`}
									</p>
									<p className="text-sm text-muted-foreground">
										{line?.description || "Cost breakdown"}
									</p>
								</div>
								<p className="font-semibold">
									{formatCurrency(Number(line?.value || line?.amount || 0))}
								</p>
							</div>
						))
					) : (
						<div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
							No cost lines available on this order yet.
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
