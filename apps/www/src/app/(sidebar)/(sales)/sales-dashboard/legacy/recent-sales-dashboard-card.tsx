"use client";

import { useDataPage } from "@/lib/data-page-context";

import { ISalesDashboard } from "@/types/dashboard";

interface Props {
    className?;
}
export default function RecentSalesDashboardCard({ className }: Props) {
    const { data: db } = useDataPage<ISalesDashboard>();
    return <></>;
}
