"use client";

import { AuthGuard } from "@/components/auth-guard";
import { EditButton } from "@/components/edit-button";
import { _perm } from "@/components/sidebar-links";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { useAuth } from "@/hooks/use-auth";
import { useProfilesList, useRolesList } from "@/hooks/use-data-list";
import { useEmployeeParams } from "@/hooks/use-employee-params";
import { useInvalidateQuery } from "@/hooks/use-invalidate-query";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Menu } from "@gnd/ui/custom/menu";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { AlertDialog } from "@gnd/ui/namespace";
import { useMutation } from "@gnd/ui/tanstack";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";

export type EmployeeRow = RouterOutputs["hrm"]["getEmployees"]["data"][number];
type OrganizationProfile = RouterOutputs["orgs"]["getOrganizationProfile"];
type Column = ColumnDef<EmployeeRow>;

export function getEmployeeRowId(employee: EmployeeRow) {
	return String(employee.id);
}

const employeeColumn: Column = {
	id: "employee",
	header: "Employee",
	accessorFn: (row) => row.name,
	...sizes.custom(240, 460, 320),
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "avatar-text", width: "w-44" },
		headerLabel: "Employee",
		className: sizeClass(
			sizes.custom(240, 460, 320),
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => {
		const employee = row.original;
		const displayName = employee.name || "Unnamed employee";

		return (
			<div className="flex min-w-0 items-center gap-3 overflow-hidden">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
					{getInitials(displayName)}
				</div>
				<div className="min-w-0 space-y-1">
					<TextWithTooltip
						className="max-w-full truncate font-medium"
						text={displayName}
					/>
					<div className="truncate font-mono text-xs text-muted-foreground">
						{employee.uid} - {employee.username || employee.email || "No login"}
					</div>
				</div>
			</div>
		);
	},
};

const roleColumn: Column = {
	id: "role",
	header: "Role",
	accessorFn: (row) => row.role,
	...sizes.custom(160, 260, 180),
	enableResizing: true,
	meta: {
		skeleton: { type: "button", width: "w-24" },
		headerLabel: "Role",
		className: sizeClass(sizes.custom(160, 260, 180)),
	},
	cell: ({ row }) => <RoleCell employee={row.original} />,
};

const officeColumn: Column = {
	id: "office",
	header: "Office",
	accessorFn: (row) => row.org?.name,
	...sizes.custom(160, 260, 190),
	enableResizing: true,
	meta: {
		skeleton: { type: "button", width: "w-24" },
		headerLabel: "Office",
		className: sizeClass(sizes.custom(160, 260, 190)),
	},
	cell: ({ row, table }) => {
		const meta = table.options.meta as
			| { orgs?: OrganizationProfile["orgs"] }
			| undefined;

		return <OfficeCell employee={row.original} orgs={meta?.orgs} />;
	},
};

const profileColumn: Column = {
	id: "profile",
	header: "Profile",
	accessorFn: (row) => row.profile?.name,
	...sizes.custom(160, 280, 200),
	enableResizing: true,
	meta: {
		skeleton: { type: "button", width: "w-24" },
		headerLabel: "Profile",
		className: sizeClass(sizes.custom(160, 280, 200)),
	},
	cell: ({ row }) => <ProfileCell employee={row.original} />,
};

const permissionsColumn: Column = {
	id: "permissions",
	header: "Permissions",
	accessorFn: (row) => row.specificPermissionCount ?? 0,
	...sizes.custom(140, 220, 160),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Permissions",
		className: sizeClass(sizes.custom(140, 220, 160)),
	},
	cell: ({ row }) => (
		<Badge variant="outline">
			{row.original.specificPermissionCount || 0} permissions
		</Badge>
	),
};

const accessColumn: Column = {
	id: "access",
	header: "Access",
	accessorFn: (row) => row.accessStatus,
	...sizes.custom(130, 220, 150),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Access",
		className: sizeClass(sizes.custom(130, 220, 150)),
	},
	cell: ({ row }) => {
		const employee = row.original;
		const revoked = employee.accessStatus === "revoked";

		return (
			<div className="min-w-0 space-y-1">
				<Badge variant={revoked ? "destructive" : "secondary"}>
					{revoked ? "Revoked" : "Active"}
				</Badge>
				{employee.revokedDate ? (
					<p className="truncate text-xs text-muted-foreground">
						Since {employee.revokedDate}
					</p>
				) : null}
			</div>
		);
	},
};

const bugReportsColumn: Column = {
	id: "bugReports",
	header: "Bug Reports",
	accessorFn: (row) => row.bugReportingEnabled,
	...sizes.custom(130, 220, 150),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Bug Reports",
		className: sizeClass(sizes.custom(130, 220, 150)),
	},
	cell: ({ row }) => (
		<Badge variant={row.original.bugReportingEnabled ? "secondary" : "outline"}>
			{row.original.bugReportingEnabled ? "Enabled" : "Disabled"}
		</Badge>
	),
};

const createdColumn: Column = {
	id: "created",
	header: "Created",
	accessorFn: (row) => row.date,
	...sizes.custom(120, 200, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Created",
		className: sizeClass(sizes.custom(120, 200, 140)),
	},
	cell: ({ row }) => (
		<span className="font-mono text-xs text-muted-foreground">
			{row.original.date}
		</span>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "Actions",
	...sizes.custom(112, 112),
	enableResizing: false,
	enableHiding: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "icon" },
		className: sizeClass(
			sizes.custom(112, 112),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => <EmployeeActions employee={row.original} />,
};

export const columns: Column[] = [
	employeeColumn,
	roleColumn,
	officeColumn,
	profileColumn,
	permissionsColumn,
	accessColumn,
	bugReportsColumn,
	createdColumn,
	actionsColumn,
];

function getInitials(value?: string | null) {
	if (!value) return "EM";

	return value
		.split(" ")
		.slice(0, 2)
		.map((segment) => segment[0]?.toUpperCase() || "")
		.join("");
}

function OfficeCell({
	employee,
	orgs,
}: {
	employee: EmployeeRow;
	orgs?: OrganizationProfile["orgs"];
}) {
	return (
		<div>
			<Menu Icon={null} variant="secondary" label={employee?.org?.name || "Not Set"}>
				{orgs?.map((org) => (
					<Menu.Item key={org.id}>{org.name}</Menu.Item>
				))}
			</Menu>
		</div>
	);
}

function ProfileCell({ employee }: { employee: EmployeeRow }) {
	const [open, setOpen] = useState(false);
	const profiles = useProfilesList(open);
	const { invalidateInfiniteQueries } = useInvalidateQuery();
	const trpc = useTRPC();
	const { mutate: updateProfile } = useMutation(
		trpc.hrm.updateEmployeeProfile.mutationOptions({
			onSuccess() {
				invalidateInfiniteQueries("hrm.getEmployees");
			},
			meta: {
				toastTitle: {
					error: "Unable to complete",
					loading: "Processing...",
					success: "Done!.",
				},
			},
		}),
	);

	return (
		<div>
			<AuthGuard
				rules={[_perm.is("editRole")]}
				Fallback={
					<Badge variant="secondary">{employee.profile?.name || "Not set"}</Badge>
				}
			>
				<Menu
					open={open}
					onOpenChanged={setOpen}
					label={employee.profile?.name || "Select Profile"}
					Icon={null}
					variant={employee?.profile?.id ? "secondary" : "destructive"}
					hoverVariant="default"
					triggerSize="xs"
				>
					<Menu.Item
						onClick={() =>
							updateProfile({
								userId: employee.id,
							})
						}
					>
						None
					</Menu.Item>
					{profiles?.map((profile) => (
						<Menu.Item
							onClick={() =>
								updateProfile({
									userId: employee.id,
									profileId: profile.id,
								})
							}
							key={profile.id}
						>
							{profile?.name}
						</Menu.Item>
					))}
				</Menu>
			</AuthGuard>
		</div>
	);
}

function RoleCell({ employee }: { employee: EmployeeRow }) {
	const [opened, setOpened] = useState(false);
	const roles = useRolesList(opened);
	const { invalidateInfiniteQueries } = useInvalidateQuery();
	const trpc = useTRPC();
	const { mutate: updateRole } = useMutation(
		trpc.hrm.updateEmployeeRole.mutationOptions({
			onSuccess() {
				invalidateInfiniteQueries("hrm.getEmployees");
			},
			meta: {
				toastTitle: {
					error: "Unable to complete",
					loading: "Processing...",
					success: "Done!.",
				},
			},
		}),
	);

	return (
		<div>
			<AuthGuard
				rules={[_perm.is("editRole")]}
				Fallback={<Badge variant="secondary">{employee.role || "Not set"}</Badge>}
			>
				<Menu
					open={opened}
					onOpenChanged={setOpened}
					label={employee.role || "Role not set"}
					Icon={null}
					variant={employee?.role ? "secondary" : "destructive"}
					hoverVariant="default"
					triggerSize="xs"
					className="h-[40vh] overflow-auto"
				>
					{roles?.map((role) => (
						<Menu.Item
							onClick={() =>
								updateRole({
									userId: employee.id,
									roleId: role.id,
								})
							}
							key={role.id}
						>
							{role?.name}
						</Menu.Item>
					))}
				</Menu>
			</AuthGuard>
		</div>
	);
}

function EmployeeActions({ employee }: { employee: EmployeeRow }) {
	const { setParams } = useEmployeeParams();
	const trpc = useTRPC();
	const { invalidateInfiniteQueries } = useInvalidateQuery();
	const toast = useLoadingToast();
	const auth = useAuth();
	const canRevokeEmployee = auth.roleTitle?.toLowerCase() === "super admin";
	const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);
	const isRevoked = employee.accessStatus === "revoked";
	const isSuperAdminEmployee = employee.role?.toLowerCase() === "super admin";
	const resetPassword = useMutation(
		trpc.hrm.resetEmployeePassword.mutationOptions({
			onSuccess() {
				toast.success("Password Reset Successfully");
			},
			onError(error) {
				toast.error(error.message || "Unable to complete");
			},
		}),
	);
	const revokeAccess = useMutation(
		trpc.hrm.revokeEmployee.mutationOptions({
			onSuccess() {
				invalidateInfiniteQueries("hrm.getEmployees");
				setConfirmRevokeOpen(false);
				toast.success("Employee access revoked");
			},
			onError(error) {
				toast.error(error.message || "Unable to revoke employee access");
			},
		}),
	);
	const restoreAccess = useMutation(
		trpc.hrm.restoreEmployeeAccess.mutationOptions({
			onSuccess() {
				invalidateInfiniteQueries("hrm.getEmployees");
				toast.success("Employee access restored");
			},
			onError(error) {
				toast.error(error.message || "Unable to restore employee access");
			},
		}),
	);
	const bugReportAccess = useMutation(
		trpc.hrm.setEmployeeBugReportingAccess.mutationOptions({
			onSuccess(data) {
				invalidateInfiniteQueries("hrm.getEmployees");
				toast.success(
					data.bugReportingEnabled
						? "Bug reports enabled"
						: "Bug reports disabled",
				);
			},
			onError(error) {
				toast.error(error.message || "Unable to update bug report access");
			},
		}),
	);

	return (
		<>
			<div className="relative z-10 flex items-center justify-end gap-1">
				{!isRevoked ? (
					<EditButton
						onClick={() => {
							setParams({
								editEmployeeId: employee.id,
							});
						}}
					/>
				) : null}
				<Menu noSize Icon={Icons.MoreHorizontal}>
					{isRevoked ? (
						canRevokeEmployee ? (
							<Menu.Item
								Icon={Icons.RotateCcw}
								onClick={() => {
									restoreAccess.mutate({
										userId: employee.id,
									});
								}}
							>
								Restore Access
							</Menu.Item>
						) : null
					) : (
						<>
							<Menu.Item
								onClick={() => {
									resetPassword.mutate({
										userId: employee.id,
									});
									toast.loading("Resetting password");
								}}
								icon="packingList"
							>
								Reset Password
							</Menu.Item>
							{canRevokeEmployee ? (
								<Menu.Item
									Icon={
										employee.bugReportingEnabled
											? Icons.CheckCircle2
											: Icons.AlertCircle
									}
									disabled={isSuperAdminEmployee || bugReportAccess.isPending}
									onClick={() => {
										bugReportAccess.mutate({
											userId: employee.id,
											enabled: !employee.bugReportingEnabled,
										});
									}}
								>
									{isSuperAdminEmployee
										? "Bug Reports Enabled By Role"
										: employee.bugReportingEnabled
											? "Disable Bug Reports"
											: "Enable Bug Reports"}
								</Menu.Item>
							) : null}
							{canRevokeEmployee ? (
								<Menu.Item
									Icon={Icons.LockKeyhole}
									className="text-destructive focus:text-destructive"
									onClick={() => {
										setConfirmRevokeOpen(true);
									}}
								>
									Revoke Access
								</Menu.Item>
							) : null}
						</>
					)}
					{isRevoked && !canRevokeEmployee ? (
						<Menu.Item disabled>No actions available</Menu.Item>
					) : null}
				</Menu>
			</div>
			<AlertDialog open={confirmRevokeOpen} onOpenChange={setConfirmRevokeOpen}>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>Revoke Employee Access</AlertDialog.Title>
						<AlertDialog.Description>
							Revoke access for {employee.name}? They will be signed out and
							removed from active employee lists. Historical records will remain.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<AlertDialog.Action
							disabled={revokeAccess.isPending}
							onClick={() => {
								revokeAccess.mutate({
									userId: employee.id,
								});
							}}
						>
							Revoke Access
						</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog>
		</>
	);
}
