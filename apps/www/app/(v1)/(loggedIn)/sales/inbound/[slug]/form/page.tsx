import { Metadata } from "next";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import InboundForm from "@/components/_v1/forms/sales-inbound-order-form/inbound-form";
import PageHeader from "@/components/_v1/page-header";
import { DataPageShell } from "@/components/_v1/shells/data-page-shell";

export const metadata: Metadata = {
    title: "New Inbound",
};

export default async function InboundFormPage({
    params: { slug },
    searchParams,
}) {
    const response = {} as any;
    // return <>a</>;
    return (
        <div className="space-y-4 px-8">
            <DataPageShell data={response}>
                <Breadcrumbs>
                    <BreadLink title="Sales" isFirst />
                    <BreadLink title="Inbounds" link="/sales/inbounds" />
                    <BreadLink title={"New"} isLast />
                </Breadcrumbs>
                <InboundForm {...response} />
            </DataPageShell>
        </div>
    );
}
