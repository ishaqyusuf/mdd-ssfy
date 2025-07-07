import { revalidateTag } from "next/cache";

export function __ccEmployeeChanged(id) {
    revalidateTag(`user_${id}`);
}
export function __ccRoleChanged(id) {
    revalidateTag(`role_${id}`);
}
export function __ccPermissionsChanged() {
    revalidateTag("permissions");
}
