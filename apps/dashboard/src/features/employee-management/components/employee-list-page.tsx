"use client";

import { EmployeeHeader } from "@/components/employee-header";
import { ErrorFallback } from "@/components/error-fallback";
import { DataTable } from "@/components/tables-2/employees/data-table";
import { EmployeesSkeleton } from "@/components/tables-2/employees/skeleton";
import { useEmployeeFilterParams } from "@/hooks/use-employee-filter-params";
import type { TableSettings } from "@/utils/table-settings";
import { Icons } from "@gnd/ui/icons";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

import { OverviewStatCard } from "./shared/overview-stat-card";

interface EmployeeListStats {
	totalEmployees: number;
	activeContractors: number;
	expiringRecords: number;
	missingInsurance: number;
}

interface Props {
	stats?: EmployeeListStats;
	initialSettings?: Partial<TableSettings>;
}

export function EmployeeListPage({ stats, initialSettings }: Props) {
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
				<Suspense
					fallback={<EmployeesSkeleton initialSettings={initialSettings} />}
				>
					<DataTable initialSettings={initialSettings} />
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}
