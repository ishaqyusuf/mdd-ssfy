"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { EmployeeOverviewPage } from "@/features/employee-management";

interface Props {
    employeeId: number;
}

export function EmployeeOverviewClient({ employeeId }: Props) {
    const { data } = useSuspenseQuery(
        useTRPC().hrm.getEmployeeOverview.queryOptions({ id: employeeId }),
    );

    return <EmployeeOverviewPage data={data} />;
}

