import { getCustomerNameDta } from "@/app/(clean-code)/(sales)/_common/data-access/customer.dta";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";

export async function generateMetadata(props) {
    const params = await props.params;
    const name = await getCustomerNameDta(params.slug);
    return constructMetadata({
        title: `${name} - gndprodesk.com`,
    });
}
export default async function CustomerOverviewPage(props) {
    const params = await props.params;
    const slug = params.slug;
    return <div></div>;
}
