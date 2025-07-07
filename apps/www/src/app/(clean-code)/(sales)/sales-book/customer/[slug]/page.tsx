import { getCustomerNameDta } from "@/app/(clean-code)/(sales)/_common/data-access/customer.dta";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

export async function generateMetadata({ params }) {
    const name = await getCustomerNameDta(params.slug);
    return constructMetadata({
        title: `${name} - gndprodesk.com`,
    });
}
export default async function CustomerOverviewPage({ params }) {
    const slug = params.slug;
    return <div></div>;
}
