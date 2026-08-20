"use client";

import { deleteProfileAction } from "@/actions/delete-profile-action";
import { getEmployeeProfilesList } from "@/actions/get-employee-profiles";
import { EmployeeProfilesColumnVisibility } from "@/components/tables-2/employee-profiles/column-visibility";
import type { EmployeeProfileRow } from "@/components/tables-2/employee-profiles/columns";
import { DataTable as EmployeeProfilesDataTable } from "@/components/tables-2/employee-profiles/data-table";
import { useRolesParams } from "@/hooks/use-roles-params";
import { generateRandomString } from "@/lib/utils";
import type { TableSettings } from "@/utils/table-settings";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useAsyncMemo } from "use-async-memo";

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export function ProfilesPage({ initialSettings }: Props) {
	const { params, setParams } = useRolesParams();
	const profiles = useAsyncMemo(
		async () => getEmployeeProfilesList(),
		[params.refreshToken],
	);

	function openProfileForm(profile?: EmployeeProfileRow) {
		setParams({
			profileEditId: profile?.id ?? null,
			profileForm: true,
		});
	}

	async function deleteProfile(profile: EmployeeProfileRow) {
		await deleteProfileAction(profile.id);
		setParams({ refreshToken: generateRandomString() });
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex justify-end gap-2">
				<EmployeeProfilesColumnVisibility />
				<Button type="button" onClick={() => openProfileForm()}>
					<Icons.Add className="mr-2 size-4" />
					Create
				</Button>
			</div>
			<EmployeeProfilesDataTable
				data={profiles?.data ?? []}
				initialSettings={initialSettings}
				isLoading={!profiles}
				onDelete={deleteProfile}
				onEdit={openProfileForm}
			/>
		</div>
	);
}
