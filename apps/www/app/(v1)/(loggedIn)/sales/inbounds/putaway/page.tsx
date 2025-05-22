import { queryParams } from "@/app/(v1)/_actions/action-utils";
import { getPutwaysAction } from "@/app/(v1)/_actions/sales-inbound/putaway.crud";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageHeader from "@/components/_v1/page-header";
import PutawayTableShell from "@/components/_v1/shells/putaway-table-shell";
import InboundLayout from "@/components/_v1/tab-layouts/inbound-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Inbounds",
};
export default async function PutawayPage(props) {
    const searchParams = await props.searchParams;
    const response = await getPutwaysAction(queryParams(searchParams));
    return (
        <InboundLayout>
            <Breadcrumbs>
                <BreadLink isFirst title="Inbounds" />
                <BreadLink isLast title="Inbound Orders" />
            </Breadcrumbs>
            <PageHeader title="Putaways" />
            <PutawayTableShell searchParams={searchParams} {...response} />
        </InboundLayout>
    );
}
