import { SalesFormResponse } from "@/app/(v1)/(loggedIn)/sales/_actions/sales-form";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import {
    BreadLink,
    OrderViewCrumb,
    OrdersCrumb,
} from "@/components/_v1/breadcrumbs/links";
import SalesForm from "@/app/(v1)/(loggedIn)/sales/order/[slug]/form/components/sales-form";
import SalesSupplySheet from "@/components/_v1/sheets/sales-supply-sheet";
import { DataPageShell } from "@/components/_v1/shells/data-page-shell";
import { Metadata } from "next";
import { _getSalesFormAction } from "../../../_actions/get-sales-form";
import { redirect } from "next/navigation";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Edit Invoice",
    description: "",
};
export default async function OrderFormPage(props) {
    const params = await props.params;

    const {
        slug
    } = params;

    redirect(`/sales/edit/order/${slug}`);
    const resp: SalesFormResponse = await _getSalesFormAction({
        orderId: slug,
        type: "order",
    });
    // console.log(resp.ctx?.items?.length);
    if (!resp.form.deliveryOption) resp.form.deliveryOption = "pickup";
    const orderId = resp?.form?.orderId;
    return (
        <AuthGuard can={["editOrders"]}>
            <DataPageShell data={resp}>
                <Breadcrumbs>
                    <OrdersCrumb isFirst />
                    {orderId && <OrderViewCrumb slug={orderId} />}
                    <BreadLink title={orderId ? "Edit" : "New"} isLast />
                </Breadcrumbs>
                <SalesForm
                    newTitle="New Order"
                    slug={slug}
                    data={resp}
                ></SalesForm>
                <SalesSupplySheet />
            </DataPageShell>
        </AuthGuard>
    );
}
