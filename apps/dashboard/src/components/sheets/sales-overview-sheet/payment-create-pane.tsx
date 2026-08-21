"use client";

import { SalesPaymentProcessorContent } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { useTRPC } from "@/trpc/client";
import Sheet from "@gnd/ui/custom/sheet-v2";
import { useQueryClient } from "@gnd/ui/tanstack";
import { useState } from "react";

export function PaymentCreatePane({
	customerId,
	customerPhone,
	onClose,
	orderNo,
	salesId,
}: {
	customerId?: number | null;
	customerPhone?: string | null;
	onClose: () => void;
	orderNo: string;
	salesId: number;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [footerTarget, setFooterTarget] = useState<HTMLDivElement | null>(null);
	const refreshPaymentState = async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.salesRefunds.overview.queryKey({ orderNo }),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.sales.getSaleOverview.queryKey({
					orderNo,
					salesType: "order",
				}),
			}),
		]);
	};

	return (
		<Sheet.SecondaryContent
			className="min-w-0 overflow-x-hidden pb-0"
			Header={
				<Sheet.SecondaryHeader
					title="Make payment"
					description={`Collect and apply a payment to ${orderNo}.`}
				/>
			}
			Footer={
				<Sheet.SecondaryFooter className="block">
					<div ref={setFooterTarget} className="w-full min-w-0" />
				</Sheet.SecondaryFooter>
			}
		>
			<SalesPaymentProcessorContent
				selectedIds={[salesId]}
				phoneNo={customerPhone || ""}
				customerId={customerId || undefined}
				footerTarget={footerTarget}
				onClose={onClose}
				onPaymentApplied={refreshPaymentState}
			/>
		</Sheet.SecondaryContent>
	);
}
