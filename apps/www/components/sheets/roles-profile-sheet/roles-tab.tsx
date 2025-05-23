import { getRolesList } from "@/actions/get-roles";
import { RolesDataTable } from "@/components/tables/roles/table";
import { rndTimeout } from "@/lib/timeout";
import { useAsyncMemo } from "use-async-memo";

export function RolesTab({}) {
    const roles = useAsyncMemo(async () => {
        await rndTimeout();
        return await getRolesList();
    }, []);
    if (!roles?.data) return null;
    return (
        <>
            <RolesDataTable data={roles?.data} />
        </>
    );
}
