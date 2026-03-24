import { PaymentPortal } from "@/components/payment-dashboard/payment-portal";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

export async function generateMetadata() {
    return constructMetadata({
        title: "Contractor Payment Portal | GND",
    });
}

export default function ContractorsPaymentPortalPage() {
    return (
        <>
            <PageTitle>Contractor Payment Portal</PageTitle>
            <PaymentPortal />
        </>
    );
}

