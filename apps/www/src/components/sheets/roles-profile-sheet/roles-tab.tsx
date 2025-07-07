import { getRolesList } from "@/actions/get-roles";
import { RolesDataTable } from "@/components/tables/roles/table";
import { useRolesParams } from "@/hooks/use-roles-params";
import { rndTimeout } from "@/lib/timeout";
import { useAsyncMemo } from "use-async-memo";

export function RolesTab({}) {
    const { params, setParams } = useRolesParams();
    const roles = useAsyncMemo(async () => {
        await rndTimeout();
        return await getRolesList();
    }, [params.refreshToken]);
    if (!roles?.data) return null;
    return (
        <>
            <RolesDataTable data={roles?.data} />
        </>
    );
}
