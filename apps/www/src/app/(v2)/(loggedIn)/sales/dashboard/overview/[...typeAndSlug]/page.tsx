import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { capitalize } from "lodash";
import SalesOverviewClient from "../_components/sales-overview-client";

export async function generateMetadata({ params, searchParams }) {
    const [type, slug] = params.typeAndSlug;
    const title = capitalize(`${type} | ${slug}`);
    return {
        title,
    };
}
export default async function Page({ searchParams, params }) {
    const [type, slug] = params.typeAndSlug;

    return (
        <FPage title={`${capitalize(`${type} | ${slug}`)}`}>
            <SalesOverviewClient />
        </FPage>
    );
}
