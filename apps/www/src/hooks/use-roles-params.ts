import {
    parseAsBoolean,
    parseAsInteger,
    parseAsString,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";

export function useRolesParams() {
    const [params, setParams] = useQueryStates({
        viewRoles: parseAsBoolean,
        roleForm: parseAsBoolean,
        profileForm: parseAsBoolean,
        primaryTab: parseAsStringEnum(["roles", "profiles"]),
        roleEditId: parseAsInteger,
        profileEditId: parseAsInteger,
        refreshToken: parseAsString,
    });
    return {
        params,
        setParams,
    };
}
