import { getEmployeeProfilesList } from "@/actions/get-employee-profiles";
import { EmployeeProfilesDataTable } from "@/components/tables/employee-profiles/table";

import { useRolesParams } from "@/hooks/use-roles-params";
import { rndTimeout } from "@/lib/timeout";
import { useAsyncMemo } from "use-async-memo";

export function ProfilesTab({}) {
    const { params, setParams } = useRolesParams();
    const roles = useAsyncMemo(async () => {
        await rndTimeout();
        return await getEmployeeProfilesList();
    }, [params.refreshToken]);
    if (!roles?.data) return null;
    return (
        <div className="space-y-4">
            <EmployeeProfilesDataTable data={roles?.data} />
        </div>
    );
}
