"use client";

import ProgressStatus from "@/components/_v1/progress-status";
import { formatDate } from "@/lib/use-day";
import { formatMoney } from "@/lib/use-number";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Skeleton } from "@gnd/ui/skeleton";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";

type SalesListItem = RouterOutputs["sales"]["quotes"]["data"][number];

type Props = {
	data?: SalesListItem[];
	loading?: boolean;
};

export function SalesList({ data, loading = false }: Props) {
	const list = data ?? [];

	return !loading && !list.length ? (
		<>
			<div className="flex h-40 items-center justify-center">
				<p className="text-muted-foreground">
					No customer sales data available
				</p>
			</div>
		</>
	) : (
		<Table className="table-sm">
			<TableHeader>
				<TableRow>
					<TableHead>Date</TableHead>
					<TableHead>P.O</TableHead>
					<TableHead>Order #</TableHead>
					<TableHead align="right" className="text-right">
						Amount
					</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{(loading ? Array.from({ length: 5 }) : list).map((tx, i) => (
					<TableRow key={tx?.id ?? `quote-skeleton-${i}`}>
						<TableCell>
							{tx ? (
								formatDate(tx.salesDate)
							) : (
								<Skeleton className="h-4 w-24" />
							)}
						</TableCell>
						<TableCell>
							{tx ? tx.poNo : <Skeleton className="h-4 w-20" />}
						</TableCell>
						<TableCell>
							{tx ? tx.orderId : <Skeleton className="h-4 w-20" />}
						</TableCell>
						<TableCell align="right">
							{tx ? (
								<>${formatMoney(tx.invoice?.total)}</>
							) : (
								<div className="flex justify-end">
									<Skeleton className="h-4 w-16" />
								</div>
							)}
						</TableCell>
						<TableCell>
							{tx ? (
								<ProgressStatus status={tx.status?.delivery?.status} />
							) : (
								<Skeleton className="h-4 w-24" />
							)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
