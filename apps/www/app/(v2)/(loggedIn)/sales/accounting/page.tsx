import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import AccountingTab from "./accounting-tab";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageShell from "@/_v2/components/page-shell";
import PageHeader from "@/components/_v1/page-header";
import SalesPaymentTableShell from "@/components/_v1/shells/sales-payment-table-shell";
import { getsalesPayments } from "@/app/(v1)/_actions/sales-payment/crud";
import { queryParams } from "@/app/(v1)/_actions/action-utils";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export default async function SalesAccountingPage(props) {
    const response = await getsalesPayments(queryParams((await props.searchParams)));
    return (
        <AuthGuard can={["editOrderPayment"]}>
            <PageShell>
                <Breadcrumbs>
                    <BreadLink isFirst title="Sales" />
                    <BreadLink isLast title="Commissions" />
                </Breadcrumbs>
                <AccountingTab />
                <PageHeader title="Sales Payments" />
                <SalesPaymentTableShell
                    searchParams={(await props.searchParams)}
                    {...response}
                />
            </PageShell>
        </AuthGuard>
    );
}
