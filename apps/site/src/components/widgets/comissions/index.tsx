import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { EmptyState, NoResults } from "./empty-states";
import { getCommissionsList } from "@/actions/get-commissions-list";
import { CommissionsTable } from "./table";
import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";

type Props = {
    query?: SearchParamsType;
};
export async function ComissionsWidget({ query = {} }: Props) {
    const profile = await getLoggedInProfile();
    const { data, meta } = await getCommissionsList({
        ...query,
        size: 5,
        "user.id": profile?.userId,
    });

    if (!data?.length) {
        if (Object.values(query).some((value) => value !== null)) {
            return <NoResults />;
        }

        return <EmptyState />;
    }
    return <CommissionsTable data={data} />;
}
