"use client";

import { PaymentOverviewContent } from "@/components/payment-dashboard/payment-overview-content";
import { useContractorPayoutParams } from "@/hooks/use-contractor-payout-params";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { formatDate } from "@gnd/utils/dayjs";
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
		</CustomModal>
	);
}
