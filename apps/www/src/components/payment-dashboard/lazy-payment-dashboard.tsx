"use client";

import dynamic from "next/dynamic";

import { TableSkeleton } from "@/components/tables/skeleton";

const PaymentDashboard = dynamic(
    () => import("./index").then((module) => module.PaymentDashboard),
    {
        loading: () => <TableSkeleton rows={8} />,
    },
);

const PaymentPortal = dynamic(
    () => import("./payment-portal").then((module) => module.PaymentPortal),
    {
        loading: () => <TableSkeleton rows={8} />,
    },
);

export function LazyPaymentDashboard() {
    return <PaymentDashboard />;
}

export function LazyPaymentPortal() {
    return <PaymentPortal />;
}
