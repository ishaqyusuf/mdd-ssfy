"use client";

import { AuthGuard } from "@/components/auth-guard";
import { EmployeeHeader } from "@/components/employee-header";
import { ErrorFallback } from "@/components/error-fallback";
import { type PageTabItem, PageTabs } from "@/components/page-tabs";
import { _perm } from "@/components/sidebar-links";
import { DataTable } from "@/components/tables-2/employees/data-table";
import { EmployeesSkeleton } from "@/components/tables-2/employees/skeleton";
import { useAuth } from "@/hooks/use-auth";
import type { TableSettings } from "@/utils/table-settings";
import { Icons } from "@gnd/ui/icons";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
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
	initialProfileSettings?: Partial<TableSettings>;
	initialRoleSettings?: Partial<TableSettings>;
}

const employeePageTabs = [
	{
		title: "Revoked Access",
		params: {
			accessStatus: "revoked",
			primaryTab: null,
			profileEditId: null,
			profileForm: null,
			roleEditId: null,
			roleForm: null,
			tab: null,
			viewRoles: null,
		},
	},
	{
		title: "Roles",
		params: {
			accessStatus: null,
			primaryTab: null,
			profileEditId: null,
			profileForm: null,
			roleEditId: null,
			roleForm: null,
			tab: "roles",
			viewRoles: null,
		},
	},
	{
		title: "Profiles",
		params: {
			accessStatus: null,
			primaryTab: null,
			profileEditId: null,
			profileForm: null,
			roleEditId: null,
			roleForm: null,
			tab: "profiles",
			viewRoles: null,
		},
	},
] satisfies PageTabItem[];

const RolesPage = dynamic(() =>
	import("./roles-page").then((module) => module.RolesPage),
);
const ProfilesPage = dynamic(() =>
	import("./profiles-page").then((module) => module.ProfilesPage),
);

export function EmployeeListPage({
	stats,
	initialSettings,
	initialProfileSettings,
	initialRoleSettings,
}: Props) {
	const auth = useAuth();
	const searchParams = useSearchParams();
	const activeTab = searchParams.get("tab");
	const isEmployeeList = activeTab !== "roles" && activeTab !== "profiles";
	const pageTabs = auth.can?.editRole
		? employeePageTabs
		: employeePageTabs.slice(0, 1);

	return (
		<div className="flex flex-col gap-6">
			{isEmployeeList ? (
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
			) : null}
			<div className="flex flex-col gap-3">
				<PageTabs
					allActiveParam={{ key: "accessStatus", value: "active" }}
					allTitle="Employees"
					maxVisible={{ base: 4, lg: 4, "2xl": 4 }}
					portal={false}
					tabs={pageTabs}
				/>
				{isEmployeeList ? <EmployeeHeader /> : null}
			</div>
			{activeTab === "roles" ? (
				<AuthGuard rules={[_perm.is("editRole")]}>
					<RolesPage initialSettings={initialRoleSettings} />
				</AuthGuard>
			) : activeTab === "profiles" ? (
				<AuthGuard rules={[_perm.is("editRole")]}>
					<ProfilesPage initialSettings={initialProfileSettings} />
				</AuthGuard>
			) : (
				<ErrorBoundary errorComponent={ErrorFallback}>
					<Suspense
						fallback={<EmployeesSkeleton initialSettings={initialSettings} />}
					>
						<DataTable initialSettings={initialSettings} />
					</Suspense>
				</ErrorBoundary>
			)}
		</div>
	);
}
