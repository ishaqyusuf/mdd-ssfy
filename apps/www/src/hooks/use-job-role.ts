import { Roles } from "@gnd/utils/constants";
import { useAuth } from "./use-auth";

export function useJobRole() {
    const auth = useAuth();
    const role = auth.role;
    return {
        isAdmin:
            (["1099 Contractor", "Punchout"] as Roles[])?.every(
                (r) => r !== role?.name,
            ) && auth.can?.editJobs,
    };
}
