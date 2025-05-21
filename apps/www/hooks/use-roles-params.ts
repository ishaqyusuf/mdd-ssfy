import { parseAsBoolean, useQueryStates } from "nuqs";

export function useRolesParams() {
    const [params, setParams] = useQueryStates({
        viewRoles: parseAsBoolean,
    });
    return {
        params,
        setParams,
    };
}
