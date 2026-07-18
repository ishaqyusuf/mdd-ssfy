"use client";

import { getCustomerTransactionOverviewAction } from "@/actions/get-customer-transaction-overview";
import { DataTable as TransactionOverviewApplicationsDataTable } from "@/components/tables-2/transaction-overview-applications/data-table";
import { DataTable as TransactionOverviewPaymentsDataTable } from "@/components/tables-2/transaction-overview-payments/data-table";
import { useTransactionOverviewModal } from "@/hooks/use-tx-overview-modal";
import type { TableSettings } from "@/utils/table-settings";
import { useAsyncMemo } from "use-async-memo";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@gnd/ui/dialog";

import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

type Props = {
	applicationInitialSettings?: Partial<TableSettings>;
	paymentInitialSettings?: Partial<TableSettings>;
};

export function TransactionOverviewModal({
	applicationInitialSettings,
	paymentInitialSettings,
}: Props) {
	const ctx = useTransactionOverviewModal();
	const txData = useAsyncMemo(async () => {
		if (!ctx.transactionId) return null;
		return await getCustomerTransactionOverviewAction(ctx.transactionId);
	}, [ctx.transactionId]);
	const salesOverview = useSalesOverviewQuery();
	const applicationRows = txData?.sales || [];
	const paymentRows = txData?.salesTx?.transactions || [];
	const isLoading = Boolean(ctx.transactionId && !txData?.id);

	return (
		<Dialog open={!!ctx.transactionId} onOpenChange={() => ctx.setParams(null)}>
			<DialogContent className="max-w-[min(920px,calc(100vw-2rem))]">
				<DialogTitle>Transaction Detail</DialogTitle>
				<DialogDescription />
				<div className="space-y-4">
					<div className="grid gap-3 rounded-lg border p-3 text-sm md:grid-cols-3">
						<div>
							<p className="text-xs uppercase text-muted-foreground">
								Payment #
							</p>
							<p className="font-medium">{txData?.paymentNo || "-"}</p>
						</div>
						<div>
							<p className="text-xs uppercase text-muted-foreground">Method</p>
							<p className="font-medium">
								{txData?.paymentMethod || "Account transaction"}
							</p>
						</div>
						<div>
							<p className="text-xs uppercase text-muted-foreground">
								Applied invoices
							</p>
							<p className="font-medium">
								{txData?.orderIds || "Wallet / account-level activity"}
							</p>
						</div>
					</div>
					<TransactionOverviewApplicationsDataTable
						data={applicationRows}
						isLoading={isLoading}
						initialSettings={applicationInitialSettings}
						onOpenSale={(orderId) => {
							salesOverview.open2(String(orderId), "sales");
						}}
					/>
					<TransactionOverviewPaymentsDataTable
						data={paymentRows}
						isLoading={isLoading}
						initialSettings={paymentInitialSettings}
						onOpenSale={(orderId) => {
							salesOverview.open2(String(orderId), "sales");
						}}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
