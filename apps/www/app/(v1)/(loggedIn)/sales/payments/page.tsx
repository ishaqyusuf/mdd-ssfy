import { queryParams } from "@/app/(v1)/_actions/action-utils";
import PageHeader from "@/components/_v1/page-header";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { getsalesPayments } from "@/app/(v1)/_actions/sales-payment/crud";
import SalesPaymentTableShell from "@/components/_v1/shells/sales-payment-table-shell";
import DeletePaymentPrompt from "@/components/_v1/modals/delete-payment-prompt";
import { Metadata } from "next";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Sales Payment",
};
interface Props {}
export default async function SalesPaymentPage(props) {
    const searchParams = await props.searchParams;
    const response = await getsalesPayments(queryParams(searchParams));
    return (
        <AuthGuard can={["viewOrderPayment"]}>
            <div className="space-y-4 px-8">
                <Breadcrumbs>
                    <BreadLink isFirst title="Sales" />
                    <BreadLink isLast title="Payments" />
                </Breadcrumbs>
                <PageHeader
                    title="Sales Payments"
                    permissions={["editOrders"]}
                />
                <SalesPaymentTableShell
                    searchParams={searchParams}
                    {...response}
                />
                <DeletePaymentPrompt />
            </div>
        </AuthGuard>
    );
}
