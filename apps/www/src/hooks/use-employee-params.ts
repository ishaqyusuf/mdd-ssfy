import {
    parseAsBoolean,
    parseAsInteger,
    parseAsJson,
    parseAsString,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";

import { useOnCloseQuery } from "./use-on-close-query";

export function useEmployeesParams() {
    const [params, setParams] = useQueryStates({
        createEmployee: parseAsBoolean,
        editEmployeeId: parseAsInteger,
        employeeViewId: parseAsInteger,
    });
    const opened = params.createEmployee || !!params.editEmployeeId;
    return {
        params,
        setParams,
        opened,
    };
}
