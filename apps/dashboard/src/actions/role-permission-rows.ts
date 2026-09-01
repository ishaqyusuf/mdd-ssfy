import { addSpacesToCamelCase } from "@/lib/utils";
import { PERMISSIONS } from "@gnd/utils/constants";

export type RolePermissionRow = {
	permission: string;
	kind: "direct" | "scoped" | "view-only";
};

export function getStaticRolePermissionNames() {
	return PERMISSIONS.map((permission) =>
		addSpacesToCamelCase(permission).toLocaleLowerCase(),
	);
}

export function getRolePermissionRows(
	permissions: Array<{ name: string }>,
): RolePermissionRow[] {
	const rows = new Map<
		string,
		{ direct: boolean; view: boolean; edit: boolean }
	>();

	for (const { name } of permissions) {
		const normalizedName = name.toLocaleLowerCase();
		const permission = normalizedName
			.replace(/^edit /, "")
			.replace(/^view /, "")
			.replace(/^review /, "");
		const row = rows.get(permission) ?? {
			direct: false,
			view: false,
			edit: false,
		};
		if (normalizedName.startsWith("view ")) row.view = true;
		else if (normalizedName.startsWith("edit ")) row.edit = true;
		else row.direct = true;
		rows.set(permission, row);
	}

	return Array.from(rows.entries())
		.map(
			([permission, actions]): RolePermissionRow => ({
				permission,
				kind:
					actions.view && !actions.edit
						? "view-only"
						: actions.view || actions.edit
							? "scoped"
							: "direct",
			}),
		)
		.sort((a, b) => a.permission.localeCompare(b.permission));
}
