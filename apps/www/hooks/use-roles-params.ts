import {
    parseAsBoolean,
    parseAsInteger,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";

export function useRolesParams() {
    const [params, setParams] = useQueryStates({
        viewRoles: parseAsBoolean,
        roleForm: parseAsBoolean,
        primaryTab: parseAsStringEnum(["roles", "profiles"]),
        roleEditId: parseAsInteger,
    });
    return {
        params,
        setParams,
    };
}
