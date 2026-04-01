import { PaymentOverviewPage } from "@/components/payment-dashboard/payment-overview-page";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ paymentId: string }>;
}) {
	const { paymentId } = await params;

	return constructMetadata({
		title: `Payout #${paymentId} | GND`,
	});
}

export default async function ContractorPaymentOverviewRoute({
	params,
}: {
	params: Promise<{ paymentId: string }>;
}) {
	const { paymentId } = await params;
	return <PaymentOverviewPage paymentId={Number(paymentId)} />;
}
