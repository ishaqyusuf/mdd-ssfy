"use client";

import { Icons } from "@gnd/ui/icons";
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { TableSkeleton } from "@/components/tables/skeleton";
import { DataTable } from "@/components/tables/employees/data-table";
import { EmployeeHeader } from "@/components/employee-header";
import { OverviewStatCard } from "./shared/overview-stat-card";
import { useEmployeeFilterParams } from "@/hooks/use-employee-filter-params";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";

interface EmployeeListStats {
	totalEmployees: number;
	activeContractors: number;
	expiringRecords: number;
	missingInsurance: number;
}

interface Props {
	stats?: EmployeeListStats;
}

export function EmployeeListPage({ stats }: Props) {
	const { filters, setFilters } = useEmployeeFilterParams();

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				<OverviewStatCard
					label="Total Employees"
					value={stats?.totalEmployees ?? "—"}
					icon={Icons.Users}
				/>
				<OverviewStatCard
					label="Active Contractors"
					value={stats?.activeContractors ?? "—"}
					icon={Icons.HardHat}
				/>
				<OverviewStatCard
					label="Expiring Records (30d)"
					value={stats?.expiringRecords ?? "—"}
					icon={Icons.AlertTriangle}
				/>
				<OverviewStatCard
					label="Missing Insurance"
					value={stats?.missingInsurance ?? "—"}
					icon={Icons.ShieldOff}
				/>
			</div>
			<div className="flex flex-col gap-3">
				<Tabs
					value={filters.accessStatus}
					onValueChange={(value) =>
						setFilters({
							accessStatus: value as "active" | "revoked",
						})
					}
					className="w-full"
				>
					<TabsList className="grid h-auto w-full grid-cols-2 rounded-lg p-1 md:w-[360px]">
						<TabsTrigger value="active">Employees</TabsTrigger>
						<TabsTrigger value="revoked">Revoked Access</TabsTrigger>
					</TabsList>
				</Tabs>
				<EmployeeHeader />
			</div>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<TableSkeleton />}>
					<DataTable />
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}
