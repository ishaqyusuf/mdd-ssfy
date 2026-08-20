"use client";

import { getRolesList } from "@/actions/get-roles";
import { RoleForm } from "@/components/forms/role-form";
import { RoleFormContext } from "@/components/hrm/role-form-context";
import { RolesColumnVisibility } from "@/components/tables-2/roles/column-visibility";
import type { RoleRow } from "@/components/tables-2/roles/columns";
import { DataTable as RolesDataTable } from "@/components/tables-2/roles/data-table";
import { useRolesParams } from "@/hooks/use-roles-params";
import type { TableSettings } from "@/utils/table-settings";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { useAsyncMemo } from "use-async-memo";

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function RolesPage({ initialSettings }: Props) {
	const { params, setParams } = useRolesParams();
	const roles = useAsyncMemo(async () => getRolesList(), [params.refreshToken]);

	function openRoleForm(role?: RoleRow) {
		setParams({
			roleEditId: role?.id ?? null,
			roleForm: true,
		});
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex justify-end gap-2">
				<RolesColumnVisibility />
				<Button type="button" onClick={() => openRoleForm()}>
					<Icons.Add className="mr-2 size-4" />
					Create
				</Button>
			</div>
			<RolesDataTable
				data={roles?.data ?? []}
				initialSettings={initialSettings}
				isLoading={!roles}
				onEdit={openRoleForm}
			/>
			<Dialog
				open={Boolean(params.roleForm)}
				onOpenChange={(open) => {
					if (!open) {
						setParams({ roleEditId: null, roleForm: null });
					}
				}}
			>
				<DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							{params.roleEditId ? "Edit role" : "Create role"}
						</DialogTitle>
					</DialogHeader>
					<RoleFormContext>
						<RoleForm />
					</RoleFormContext>
				</DialogContent>
			</Dialog>
		</div>
	);
}
