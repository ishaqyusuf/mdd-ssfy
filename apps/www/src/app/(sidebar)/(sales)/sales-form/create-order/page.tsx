import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { NewSalesForm } from "@/components/forms/new-sales-form/new-sales-form";

export async function generateMetadata() {
    return constructMetadata({
        title: "Create Order - gndprodesk.com",
    });
}

export default async function Page() {
    return (
        <FPage title="Create Order">
            <NewSalesForm mode="create" type="order" />
        </FPage>
    );
}
