"use client";

import { CancelContractorPayoutButton } from "@/components/payment-dashboard/cancel-contractor-payout-button";
import { PaymentOverviewContent } from "@/components/payment-dashboard/payment-overview-content";
import { ReverseContractorPayoutButton } from "@/components/payment-dashboard/reverse-contractor-payout-button";
import { useContractorPayoutParams } from "@/hooks/use-contractor-payout-params";
import { printContractorPayoutReport } from "@/lib/job-print";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { useQuery } from "@gnd/ui/tanstack";
import { formatDate } from "@gnd/utils/dayjs";
import { Printer } from "lucide-react";
import { CustomModal } from "./custom-modal";

export function ContractorPayoutOverviewModal() {
	const { openContractorPayoutId, setParams } = useContractorPayoutParams();
	const trpc = useTRPC();
	const { data, isPending } = useQuery(
		trpc.jobs.contractorPayoutOverview.queryOptions(
			{
				paymentId: openContractorPayoutId || 0,
			},
			{
				enabled: !!openContractorPayoutId,
			},
		),
	);

	return (
		<CustomModal
			open={!!openContractorPayoutId}
			onOpenChange={(open) => {
				if (!open) {
					setParams(null);
				}
			}}
			size="3xl"
			title={data ? `Payout #${data.id}` : "Payout overview"}
			description={
				data
					? `${data.paidTo?.name || "Unknown contractor"} • ${formatDate(data.createdAt)}`
					: "Payout overview"
			}
		>
			<CustomModal.Content className="lg:max-h-[70vh]">
				<PaymentOverviewContent data={data} isPending={isPending} />
			</CustomModal.Content>
			<CustomModal.Footer className="flex items-center justify-end gap-2 border-t pt-4">
				{data?.id && data.isCancelled ? (
					<ReverseContractorPayoutButton
						paymentId={data.id}
						isCancelled={data.isCancelled}
						variant="outline"
					/>
				) : null}
				{data?.id && !data.isCancelled ? (
					<CancelContractorPayoutButton
						paymentId={data.id}
						isCancelled={data.isCancelled}
						variant="outline"
					/>
				) : null}
				<Button
					type="button"
					variant="outline"
					className="gap-2"
					disabled={!data?.id}
					onClick={() =>
						data?.id
							? printContractorPayoutReport({ paymentIds: [data.id] })
							: null
					}
				>
					<Printer className="size-4" />
					Print Report
				</Button>
			</CustomModal.Footer>
		</CustomModal>
	);
}
