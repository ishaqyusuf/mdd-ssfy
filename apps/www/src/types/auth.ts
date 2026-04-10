import type {
	PERMISSION_NAMES,
	PERMISSION_NAMES_PASCAL,
} from "@gnd/utils/constants";

export type ICan = { [permission in PermissionScope]: boolean };

type PascalResource = (typeof PERMISSION_NAMES_PASCAL)[number];
type Resource = (typeof PERMISSION_NAMES)[number];
type Action = "edit" | "view" | "review";
// type PermissionScopeDot = `${Action}.${Resource}`;
export type PermissionScope = `${Action}${PascalResource}`;
