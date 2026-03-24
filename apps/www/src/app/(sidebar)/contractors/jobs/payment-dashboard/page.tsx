import { PaymentDashboard } from "@/components/payment-dashboard";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export async function generateMetadata() {
	return constructMetadata({
		title: "Contractor Payment Dashboard | GND",
	});
}

export default function ContractorsPaymentDashboardPage() {
	return <PaymentDashboard />;
}
