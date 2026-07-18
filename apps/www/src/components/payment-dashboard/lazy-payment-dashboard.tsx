"use client";

import dynamic from "next/dynamic";

import { ContractorPayoutsSkeleton } from "@/components/tables-2/contractor-payouts/skeleton";
import type { TableSettings } from "@/utils/table-settings";

type PaymentDashboardProps = {
	contractorQueueInitialSettings?: Partial<TableSettings>;
	recentPaymentsInitialSettings?: Partial<TableSettings>;
};

type PaymentPortalProps = {
	paymentPortalJobsInitialSettings?: Partial<TableSettings>;
};

const PaymentDashboard = dynamic(
	() => import("./index").then((module) => module.PaymentDashboard),
	{
		loading: () => <ContractorPayoutsSkeleton rowCount={8} />,
	},
);

const PaymentPortal = dynamic(
	() => import("./payment-portal").then((module) => module.PaymentPortal),
	{
		loading: () => <ContractorPayoutsSkeleton rowCount={8} />,
	},
);

export function LazyPaymentDashboard(props: PaymentDashboardProps) {
	return <PaymentDashboard {...props} />;
}

export function LazyPaymentPortal(props: PaymentPortalProps) {
	return <PaymentPortal {...props} />;
}
