import { SalesFormResponse } from "@/app/(v1)/(loggedIn)/sales/_actions/sales-form";
import { _getSalesFormAction } from "@/app/(v1)/(loggedIn)/sales/_actions/get-sales-form";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import {
    BreadLink,
    OrderViewCrumb,
    OrdersCrumb,
} from "@/components/_v1/breadcrumbs/links";
import EditSalesForm from "../../components/form";
import { Metadata } from "next";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
export const metadata: Metadata = {
    title: "Edit Sales | GND",
};
export default async function EditSalesPage({ searchParams, params }) {
    const { type, slug } = params;
    const resp: SalesFormResponse = await _getSalesFormAction({
        orderId: slug,
        type,
    });
    // console.log(resp.form.items[0]?.deletedAt);

    let title = [
        `${resp.form.id ? "Edit" : "New"} ${type}`,
        resp.form.id && slug,
    ]
        .filter(Boolean)
        .join(": ");
    // if (!resp.form.deliveryOption) resp.form.deliveryOption = "pickup";
    const orderId = resp?.form?.orderId;
    metadata.title = title;
    const suppliers = resp.form?.items?.map((item) => item.supplier) || [];
    resp.ctx.suppliers = [...new Set([...resp.ctx.suppliers, ...suppliers])];
    return (
        <div id="salesEditPage">
            <AuthGuard can={["editOrders"]}>
                <Breadcrumbs>
                    <OrdersCrumb isFirst />
                    {orderId && <OrderViewCrumb slug={orderId} />}
                    <BreadLink title={orderId ? "Edit" : "New"} isLast />
                </Breadcrumbs>
                <EditSalesForm data={resp} />
            </AuthGuard>
        </div>
    );
}
