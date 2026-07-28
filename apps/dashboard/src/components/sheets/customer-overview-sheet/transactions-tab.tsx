import { getCustomerWalletHistoryAction } from "@/actions/get-customer-wallet-history";

import { EmptyState } from "@/components/empty-state";
import { CustomerTransactionsColumnVisibility } from "@/components/tables-2/customer-transactions/column-visibility";
import type { CustomerTransactionRow } from "@/components/tables-2/customer-transactions/columns";
import { DataTable as CustomerTransactionsDataTable } from "@/components/tables-2/customer-transactions/data-table";
import {
	DataSkeletonProvider,
	useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { useTransactionOverviewModal } from "@/hooks/use-tx-overview-modal";
import { formatMoney } from "@/lib/use-number";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { useQuery } from "@gnd/ui/tanstack";

interface Props {
	accountNo?: string;
	salesId?: string;
}
export function TransactionsTab({ accountNo, salesId }: Props) {
	const trpc = useTRPC();
	const transactionsQuery = useQuery(
		trpc.sales.getSaleTransactions.queryOptions(
			{
				orderNo: salesId,
				accountNo: salesId ? undefined : accountNo,
			},
			{
				enabled: Boolean(salesId || accountNo),
			},
		),
	);
	const walletLoader = async () => {
		if (salesId || !accountNo) {
			return { balance: 0, data: [] };
		}
		return getCustomerWalletHistoryAction(accountNo);
	};
	const skel = useCreateDataSkeletonCtx({
		loader: walletLoader,
		autoLoad: true,
		deps: [salesId, accountNo],
	});
	const transactions = transactionsQuery.data?.data || [];
	const walletHistory = skel?.data;
	const hasLoaded = !transactionsQuery.isPending;

	return (
		<div className="flex flex-col">
			<EmptyState
				empty={hasLoaded && transactions.length === 0}
				title="Empty Transactions"
				description={
					salesId
						? `No transactions found for ${salesId}`
						: `No transactions found for ${accountNo}`
				}
			>
				<DataSkeletonProvider value={skel}>
					<div className="flex flex-col w-full gap-4 overflow-auto">
						{!salesId ? (
							<WalletHistoryPanel
								balance={walletHistory?.balance || 0}
								items={walletHistory?.data || []}
							/>
						) : null}
						<div className="flex items-center justify-end">
							<CustomerTransactionsColumnVisibility />
						</div>
						<CustomerTransactionsDataTable
							data={(transactions as CustomerTransactionRow[]) || []}
							isLoading={transactionsQuery.isPending}
						/>
					</div>
				</DataSkeletonProvider>
			</EmptyState>
		</div>
	);
}

type WalletHistoryItem = Awaited<
	ReturnType<typeof getCustomerWalletHistoryAction>
>["data"][number];

function WalletHistoryPanel({
	balance,
	items,
}: {
	balance: number;
	items: WalletHistoryItem[];
}) {
	const preview = items.slice(0, 6);
	const transactionModal = useTransactionOverviewModal();

	return (
		<div className="rounded-lg border bg-background">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
				<div>
					<h3 className="text-sm font-semibold">Wallet history</h3>
					<p className="text-xs text-muted-foreground">
						Credits, wallet payments, and invoice applications.
					</p>
				</div>
				<div className="text-right">
					<p className="text-xs text-muted-foreground">Current balance</p>
					<p className="font-mono text-sm font-semibold">
						${formatMoney(balance)}
					</p>
				</div>
			</div>
			{preview.length ? (
				<div className="divide-y">
					{preview.map((item) => (
						<div
							key={item.id}
							className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[1.2fr_1fr_auto]"
						>
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<p className="font-medium">{item.activity}</p>
									<Badge variant="outline" className="text-[10px] uppercase">
										#{item.paymentNo}
									</Badge>
								</div>
								<p className="mt-1 truncate text-xs text-muted-foreground">
									{item.source || item.description || "Wallet transaction"}
								</p>
							</div>
							<div className="min-w-0 text-xs text-muted-foreground">
								<p>
									Applied to:{" "}
									<span className="font-medium text-foreground">
										{item.appliedTo || "Not applied to an invoice"}
									</span>
								</p>
								<p>
									Balance after:{" "}
									<span className="font-mono text-foreground">
										${formatMoney(item.runningBalance)}
									</span>
								</p>
							</div>
							<div className="flex items-center justify-end gap-2">
								<span
									className={cn(
										"font-mono text-sm font-semibold tabular-nums",
										item.creditAmount > 0 ? "text-emerald-700" : "text-red-700",
									)}
								>
									{item.creditAmount > 0 ? "+" : "-"}$
									{formatMoney(item.creditAmount || item.debitAmount)}
								</span>
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="h-7 px-2 text-xs"
									onClick={() => transactionModal.viewTx(item.id)}
								>
									View
								</Button>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="px-4 py-6 text-sm text-muted-foreground">
					No wallet activity yet.
				</div>
			)}
		</div>
	);
}
