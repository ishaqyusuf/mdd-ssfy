"use client";

import { TransactionsTab } from "@/components/sheets/customer-overview-sheet/transactions-tab";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

import { useSalesOverviewSystem } from "../provider";
import { OverviewSectionCard, OverviewSectionLabel } from "../section-primitives";
import { formatCurrency, getPaymentBalance } from "../view-model";

export function SalesOverviewTransactionsTab() {
	const {
		state: { data, overviewId, isQuote },
	} = useSalesOverviewSystem();
	const balance = getPaymentBalance(data?.invoice);
	const canReceivePayment = !isQuote && balance > 0 && data?.id;
	const transactionSalesId = data?.orderId || overviewId || null;

	return (
		<div className="space-y-4 p-1">
			{canReceivePayment ? (
				<OverviewSectionCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<OverviewSectionLabel
							icon={Icons.DollarSign}
							label="Receive Payment"
						/>
						<p className="text-sm font-medium">
							Balance due {formatCurrency(balance)}
						</p>
					</div>
					<SalesPaymentProcessor
						selectedIds={[data.id]}
						phoneNo={data.customerPhone}
						customerId={data.customerId}
					>
						<Button className="w-full sm:w-auto">
							<Icons.payment className="mr-2 size-4" />
							Receive Payment
						</Button>
					</SalesPaymentProcessor>
				</OverviewSectionCard>
			) : null}
			{transactionSalesId ? (
				<TransactionsTab
					key={transactionSalesId}
					salesId={transactionSalesId}
				/>
			) : null}
		</div>
	);
}
