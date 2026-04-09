"use client";

import { Icons } from "@gnd/ui/icons";

import PageShell from "@/components/page-shell";
import { CancelContractorPayoutButton } from "@/components/payment-dashboard/cancel-contractor-payout-button";
import { printContractorPayoutReport } from "@/lib/job-print";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { useQuery } from "@gnd/ui/tanstack";
import Link from "next/link";
import { PaymentOverviewContent } from "./payment-overview-content";
import { ReverseContractorPayoutButton } from "./reverse-contractor-payout-button";

export function PaymentOverviewPage({
	paymentId,
}: {
	paymentId: number;
}) {
	const trpc = useTRPC();
	const { data, isPending } = useQuery(
		trpc.jobs.contractorPayoutOverview.queryOptions({
			paymentId,
		}),
	);

	return (
		<PageShell className="gap-6">
			<div className="flex items-center justify-between gap-3">
				<Button asChild variant="outline">
					<Link href="/contractors/jobs/payments">
						<Icons.ArrowLeft data-icon="inline-start" />
						Back to payments
					</Link>
				</Button>
				<div className="flex items-center gap-2">
					{data?.isCancelled ? (
						<ReverseContractorPayoutButton
							paymentId={paymentId}
							isCancelled={data.isCancelled}
							variant="outline"
						/>
					) : (
						<CancelContractorPayoutButton
							paymentId={paymentId}
							isCancelled={data?.isCancelled}
							variant="outline"
						/>
					)}
					<Button
						variant="outline"
						className="gap-2"
						disabled={!paymentId}
						onClick={() =>
							printContractorPayoutReport({
								paymentIds: [paymentId],
							})
						}
					>
						<Icons.Printer className="size-4" />
						Print Report
					</Button>
				</div>
			</div>
			<PaymentOverviewContent data={data} isPending={isPending} />
		</PageShell>
	);
}
