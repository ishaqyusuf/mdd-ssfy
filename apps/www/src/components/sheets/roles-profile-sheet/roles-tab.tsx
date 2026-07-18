import { getRolesList } from "@/actions/get-roles";
import Portal from "@/components/_v1/portal";
import { RolesColumnVisibility } from "@/components/tables-2/roles/column-visibility";
import type { RoleRow } from "@/components/tables-2/roles/columns";
import { DataTable as RolesDataTable } from "@/components/tables-2/roles/data-table";
import { RolesSkeleton } from "@/components/tables-2/roles/skeleton";
import { useRolesParams } from "@/hooks/use-roles-params";
import { rndTimeout } from "@/lib/timeout";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useAsyncMemo } from "use-async-memo";

export function RolesTab() {
	const { params, setParams } = useRolesParams();
	const roles = useAsyncMemo(async () => {
		await rndTimeout();
		return await getRolesList();
	}, [params.refreshToken]);
	function editRole(role: RoleRow) {
		setParams({
			roleForm: true,
			roleEditId: role.id,
		});
	}

	return (
		<>
			<Portal noDelay nodeId="tabActions">
				<div className="flex items-center justify-end gap-2">
					<RolesColumnVisibility />
					<Button
						type="button"
						onClick={() =>
							setParams({
								roleForm: true,
								roleEditId: null,
							})
						}
					>
						<Icons.Add className="mr-2 size-4" />
						Create
					</Button>
				</div>
			</Portal>
			{roles?.data ? (
				<RolesDataTable data={roles.data} onEdit={editRole} />
			) : (
				<RolesSkeleton rowCount={6} />
			)}
		</>
	);
}
