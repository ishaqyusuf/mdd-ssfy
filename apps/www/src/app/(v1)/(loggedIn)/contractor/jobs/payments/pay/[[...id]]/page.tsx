import { getPayableUsers } from "@/app/(v1)/_actions/hrm-jobs/make-payment";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { SecondaryCellContent } from "@/components/_v1/columns/base-columns";
import JobPaymentForm from "@/components/_v1/forms/job-payment-form";
import Money from "@/components/_v1/money";
import PageHeader from "@/components/_v1/page-header";

import { cn } from "@/lib/utils";
import { Metadata } from "next";
import Link from "next/link";
import TabbedLayout from "@/components/_v1/tab-layouts/tabbed-layout";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import JobTableShell from "../../../job-table-shell";
export const metadata: Metadata = {
    title: "Payment Portal",
};
export default async function PaymentPage({ params }) {
    const userId = params?.id?.[0];
    const { payables, jobs } = await getPayableUsers(userId);
    const user = payables?.find((u) => u.id == userId);
    if (user) metadata.title = user.name;

    return (
        <AuthGuard can={["editJobPayment"]}>
            <TabbedLayout tabKey="Job">
                <Breadcrumbs>
                    <BreadLink isFirst title="Hrm" />
                    <BreadLink isLast title="Payment Portal" />
                </Breadcrumbs>
                <PageHeader
                    title={
                        user
                            ? user.name
                            : !payables.length
                            ? "No Pending Payment"
                            : "Make Payment"
                    }
                />
                <div className="flex gap-4">
                    <div className="flex flex-col divide-y">
                        {payables.map((user) => (
                            <Link
                                key={user.id}
                                href={`/contractor/jobs/payments/pay/${user.id}`}
                                className={cn(
                                    "p-2 text-sm pr-4",
                                    userId == user.id
                                        ? "bg-accent"
                                        : "hover:bg-accent"
                                )}
                            >
                                <div className="font-medium">{user.name}</div>
                                <SecondaryCellContent className="flex justify-start">
                                    <Money
                                        className="text-sm"
                                        value={user.total}
                                    />
                                </SecondaryCellContent>
                            </Link>
                        ))}
                    </div>
                    <div className="flex-1">
                        {jobs && user && (
                            <div className="space-y-4">
                                <JobTableShell payment {...(jobs as any)} />
                                <JobPaymentForm user={user as any} />
                            </div>
                        )}
                    </div>
                </div>
            </TabbedLayout>
        </AuthGuard>
    );
}
