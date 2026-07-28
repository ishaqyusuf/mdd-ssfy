import { deleteProfileAction } from "@/actions/delete-profile-action";
import { getEmployeeProfilesList } from "@/actions/get-employee-profiles";
import Portal from "@/components/_v1/portal";
import { EmployeeProfilesColumnVisibility } from "@/components/tables-2/employee-profiles/column-visibility";
import type { EmployeeProfileRow } from "@/components/tables-2/employee-profiles/columns";
import { DataTable as EmployeeProfilesDataTable } from "@/components/tables-2/employee-profiles/data-table";
import { EmployeeProfilesSkeleton } from "@/components/tables-2/employee-profiles/skeleton";

import { useRolesParams } from "@/hooks/use-roles-params";
import { rndTimeout } from "@/lib/timeout";
import { generateRandomString } from "@/lib/utils";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useAsyncMemo } from "use-async-memo";

export function ProfilesTab() {
	const { params, setParams } = useRolesParams();
	const roles = useAsyncMemo(async () => {
		await rndTimeout();
		return await getEmployeeProfilesList();
	}, [params.refreshToken]);
	function editProfile(profile: EmployeeProfileRow) {
		setParams({
			profileForm: true,
			profileEditId: profile.id,
		});
	}

	async function deleteProfile(profile: EmployeeProfileRow) {
		await deleteProfileAction(profile.id);
		setParams({
			refreshToken: generateRandomString(),
		});
	}

	return (
		<>
			<Portal noDelay nodeId="tabActions">
				<div className="flex items-center justify-end gap-2">
					<EmployeeProfilesColumnVisibility />
					<Button
						type="button"
						onClick={() =>
							setParams({
								profileForm: true,
								profileEditId: null,
							})
						}
					>
						<Icons.Add className="mr-2 size-4" />
						Create
					</Button>
				</div>
			</Portal>
			{roles?.data ? (
				<EmployeeProfilesDataTable
					data={roles.data}
					onEdit={editProfile}
					onDelete={deleteProfile}
				/>
			) : (
				<EmployeeProfilesSkeleton rowCount={6} />
			)}
		</>
	);
}
