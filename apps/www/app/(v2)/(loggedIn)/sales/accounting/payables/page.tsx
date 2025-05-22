import AccountingTab from "../accounting-tab";
import getPayablesAction from "./_actions/get-payables";
import PayablesTable from "./payable-tables";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import PageShell from "@/_v2/components/page-shell";
import PageHeader from "@/components/_v1/page-header";
import { Metadata } from "next";
import { getPayableAnalyticsStats } from "./_actions/analytics";
import { StatCards } from "@/components/common/stat-cards";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Payables",
};
export default async function PayablesPage(props) {
    const searchParams = await props.searchParams;
    const promise = getPayablesAction(searchParams);
    const statCards = await getPayableAnalyticsStats(searchParams);

    return (
        <AuthGuard can={["editOrderPayment"]}>
            <PageShell>
                <Breadcrumbs>
                    <BreadLink isFirst title="Sales" />
                    <BreadLink isLast title="Commissions" />
                </Breadcrumbs>
                <AccountingTab />
                <div className="flex items-end justify-between">
                    <PageHeader title="Payables" />

                    <StatCards cards={statCards} />
                </div>
                <PayablesTable promise={promise} />
            </PageShell>
        </AuthGuard>
    );
}
