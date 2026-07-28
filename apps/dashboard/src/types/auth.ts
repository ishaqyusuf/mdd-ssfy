import type {
	EXTRA_PERMISSION_SCOPES,
	PERMISSION_NAMES,
	PERMISSION_NAMES_PASCAL,
} from "@gnd/utils/constants";

export type ICan = { [permission in PermissionScope]: boolean };

export type PascalResource = (typeof PERMISSION_NAMES_PASCAL)[number];
export type Resource = (typeof PERMISSION_NAMES)[number];
type Action = "edit" | "view" | "review";
type ExtraPermissionScope = (typeof EXTRA_PERMISSION_SCOPES)[number];
// type PermissionScopeDot = `${Action}.${Resource}`;
export type PermissionScope = `${Action}${PascalResource}` | ExtraPermissionScope;
