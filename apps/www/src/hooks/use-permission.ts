import { ICan } from "@/types/auth";
import { useSession } from "@/lib/auth/client";

export function usePermission() {
    const { data: session } = useSession({
        required: false,
    });
    const can = session?.can;
    type T = keyof NonNullable<typeof can>;
    return {
        permissions: can,
        can(...actions: T[]) {
            return actions.every((a) => can?.[a]);
        },
        any(...actions: T[]) {
            return actions.some((a) => can?.[a]);
        },
    };
}
