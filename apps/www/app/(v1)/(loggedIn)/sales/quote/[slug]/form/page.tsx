import {
    SalesFormResponse,
    salesFormAction,
} from "@/app/(v1)/(loggedIn)/sales/_actions/sales-form";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import {
    BreadLink,
    EstimatesCrumb,
    OrdersCrumb,
} from "@/components/_v1/breadcrumbs/links";
import SalesForm from "@/app/(v1)/(loggedIn)/sales/order/[slug]/form/components/sales-form";
import { DataPageShell } from "@/components/_v1/shells/data-page-shell";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Edit Invoice",
    description: "",
};

export default async function EstimateFormPage(props) {
    const params = await props.params;

    const {
        slug
    } = params;

    redirect(`/sales/edit/quote/${slug}`);
    const resp: SalesFormResponse = await salesFormAction({
        orderId: slug,
        type: "quote",
    });
    const orderId = resp?.form?.orderId;
    return (
        // <SalesForm newTitle="New Estimate" slug={slug} data={resp}></SalesForm>
        <AuthGuard can={["editEstimates"]}>
            <DataPageShell data={resp}>
                <Breadcrumbs>
                    <EstimatesCrumb isFirst />
                    {orderId && (
                        <BreadLink
                            title={orderId}
                            link={`/sales/quote/${orderId}`}
                            slug={orderId}
                        />
                    )}
                    <BreadLink title={orderId ? "Edit" : "New"} isLast />
                </Breadcrumbs>
                <SalesForm
                    newTitle="New Quote"
                    slug={slug}
                    data={resp}
                ></SalesForm>
            </DataPageShell>
        </AuthGuard>
    );
}
