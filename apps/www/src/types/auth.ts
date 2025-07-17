import {
    PERMISSION_NAMES,
    PERMISSION_NAMES_PASCAL,
} from "@/data/contants/permissions";

export type ICan = { [permission in PermissionScope]: boolean };

export type PascalResource = (typeof PERMISSION_NAMES_PASCAL)[number];
export type Resource = (typeof PERMISSION_NAMES)[number];
type Action = "edit" | "view";
// type PermissionScopeDot = `${Action}.${Resource}`;
export type PermissionScope = `${Action}${PascalResource}`;
