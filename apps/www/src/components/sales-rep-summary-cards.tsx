import {
    getSalesRepActiveCustomers,
    getSalesRepCommissionSummary,
    getSalesRepTotalSales,
} from "@/actions/cached-commission-queries";
import { authId } from "@/app/(v1)/_actions/utils";

import { SummaryCard } from "./summary-card";

export async function SalesRepTotalSales({}) {
    const userId = await authId();
    const resp = await getSalesRepTotalSales({ "salesRep.id": userId });
    return (
        <SummaryCard
            total_amount={resp?.totalReceived}
            title="Total Sales"
            subtitle={`${resp?.count} sales`}
        />
    );
}
export async function SalesRepCommissionEarned({}) {
    const userId = await authId();
    const resp = await getSalesRepCommissionSummary({ "salesRep.id": userId });
    return (
        <SummaryCard
            total_amount={resp?.totalAmount}
            title="Commission Earned"
            subtitle={`${resp?.count} sales`}
        />
    );
}
export async function SalesRepPendingCommission({}) {
    const userId = await authId();
    const resp = await getSalesRepCommissionSummary({
        "salesRep.id": userId,
        "commission.filter": "pending",
    });
    return (
        <SummaryCard
            subtitle={`${resp?.count} sales`}
            total_amount={resp?.totalAmount}
            title="Pending Commissions"
        />
    );
}
export async function SalesRepActiveCustomers({}) {
    const userId = await authId();
    const resp = await getSalesRepActiveCustomers({
        "salesRep.id": userId,
    });
    return (
        <SummaryCard
            currency={"number"}
            total_amount={resp?.activeCustomerCount}
            title="Active Customers"
            subtitle={`+${resp.percentChange || 0}% from last month`}
        />
    );
}
