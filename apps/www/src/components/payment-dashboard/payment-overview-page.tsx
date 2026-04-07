"use client";

import PageShell from "@/components/page-shell";
import { printContractorPayoutReport } from "@/lib/job-print";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { useQuery } from "@gnd/ui/tanstack";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { PaymentOverviewContent } from "./payment-overview-content";

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
						<ArrowLeft data-icon="inline-start" />
						Back to payments
					</Link>
				</Button>
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
					<Printer className="size-4" />
					Print Report
				</Button>
			</div>
			<PaymentOverviewContent data={data} isPending={isPending} />
		</PageShell>
	);
}
