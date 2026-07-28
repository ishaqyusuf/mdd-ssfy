"use client";

import { BugReportAccessEmployeesColumnVisibility } from "@/components/tables-2/bug-report-access-employees/column-visibility";
import { DataTable as BugReportAccessEmployeesTable } from "@/components/tables-2/bug-report-access-employees/data-table";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import Link from "next/link";
import { useMemo, useState } from "react";

type Employee = RouterOutputs["hrm"]["getEmployees"]["data"][number];

function isSuperAdminEmployee(employee: Employee) {
	return employee.role?.toLowerCase() === "super admin";
}

export function BugReportAccessSettingsPage({
	initialSettings,
}: {
	initialSettings?: Partial<TableSettings>;
}) {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
	const isSuperAdmin = auth.roleTitle?.toLowerCase() === "super admin";

	const employeesQuery = useQuery(
		trpc.hrm.getEmployees.queryOptions(
			{
				accessStatus: "active",
				size: 200,
			},
			{
				enabled: auth.enabled && isSuperAdmin,
			},
		),
	);
	const employees = employeesQuery.data?.data ?? [];
	const enabledCount = employees.filter(
		(employee) => employee.bugReportingEnabled,
	).length;
	const explicitEnabledCount = employees.filter(
		(employee) =>
			employee.bugReportingEnabled && !isSuperAdminEmployee(employee),
	).length;
	const filteredEmployees = useMemo(() => {
		const term = search.trim().toLowerCase();
		if (!term) return employees;
		return employees.filter((employee) => {
			return [employee.name, employee.email, employee.role]
				.filter(Boolean)
				.some((value) => value?.toLowerCase().includes(term));
		});
	}, [employees, search]);

	const refreshEmployees = async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.hrm.getEmployees.queryKey(),
		});
	};

	const bugReportAccess = useMutation(
		trpc.hrm.setEmployeeBugReportingAccess.mutationOptions({
			async onSuccess(data) {
				await refreshEmployees();
				toast({
					title: data.bugReportingEnabled
						? "Bug report access enabled"
						: "Bug report access disabled",
					variant: "success",
				});
				setUpdatingUserId(null);
			},
			onError(error) {
				toast({
					title: "Unable to update bug report access",
					description: error.message,
					variant: "destructive",
				});
				setUpdatingUserId(null);
			},
		}),
	);

	if (!isSuperAdmin) {
		return (
			<div className="rounded-md border bg-background p-6">
				<div className="flex items-start gap-3">
					<Icons.AlertCircle className="mt-1 size-5 text-muted-foreground" />
					<div>
						<h2 className="font-semibold">Super Admin access required</h2>
						<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
							Only Super Admin users can choose which employees see the bug
							report button.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
			<section className="overflow-hidden rounded-md border bg-background">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
					<div>
						<h2 className="font-semibold">Employee access</h2>
						<p className="text-sm text-muted-foreground">
							Choose who can see the header bug button and submit reports.
						</p>
					</div>
					<div className="flex w-full items-center gap-2 sm:w-auto">
						<Input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search employees"
							className="h-9 sm:w-64"
						/>
						<BugReportAccessEmployeesColumnVisibility />
					</div>
				</div>

				<BugReportAccessEmployeesTable
					data={filteredEmployees}
					emptyText={
						search.trim()
							? "No employees match this search."
							: "No active employees are available."
					}
					initialSettings={initialSettings}
					isLoading={employeesQuery.isLoading}
					mutationPending={bugReportAccess.isPending}
					updatingUserId={updatingUserId}
					onToggleAccess={(employee, enabled) => {
						setUpdatingUserId(employee.id);
						bugReportAccess.mutate({
							userId: employee.id,
							enabled,
						});
					}}
				/>
			</section>

			<aside className="space-y-4">
				<div className="rounded-md border bg-background p-4">
					<p className="text-sm text-muted-foreground">Enabled employees</p>
					<p className="mt-2 text-3xl font-semibold">{enabledCount}</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{explicitEnabledCount} selected manually. Super Admin users are
						enabled by role.
					</p>
				</div>
				<div className="rounded-md border bg-background p-4">
					<p className="text-sm font-medium">Review submitted reports</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Open the support board to review screenshots, recordings, voice
						notes, transcriptions, and linked issues.
					</p>
					<Button asChild className="mt-4 w-full" variant="outline">
						<Link href="/support/bug-reports">Open Bug Reports</Link>
					</Button>
				</div>
			</aside>
		</div>
	);
}
