import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export function useRolesList(enabled = false) {
    const { data: roles } = useQuery(
        useTRPC().hrm.getRoles.queryOptions(undefined, {
            enabled,
        }),
    );
    return roles || [];
}

export function useProfilesList(enabled = false) {
    const { data: profiles } = useQuery(
        useTRPC().hrm.getProfiles.queryOptions(undefined, {
            enabled,
        }),
    );
    return profiles || [];
}
export function useOrganizationList(enabled = false) {
    const { data: organizations } = useQuery(
        useTRPC().orgs.getOrganizationProfile.queryOptions(undefined, {
            enabled,
        }),
    );
    return (organizations?.orgs || []).map((o) => ({
        id: o.id,
        name: o.name,
    }));
}

