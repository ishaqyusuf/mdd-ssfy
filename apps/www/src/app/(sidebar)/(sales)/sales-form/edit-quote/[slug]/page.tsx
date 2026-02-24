import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { NewSalesForm } from "@/components/forms/new-sales-form/new-sales-form";

export async function generateMetadata(props) {
    const params = await props.params;
    return constructMetadata({
        title: `Edit Quote | ${params.slug} - gndprodesk.com`,
    });
}

export default async function Page(props) {
    const params = await props.params;
    return (
        <FPage title={`Edit Quote | ${params.slug}`}>
            <NewSalesForm mode="edit" type="quote" slug={params.slug} />
        </FPage>
    );
}
