import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsInteger } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["hrm"]["getEmployees"], void>;

export const employeeFilterParams = {
    q: parseAsString,
    role: parseAsString,
    profile: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export function useEmployeeFilterParams() {
    const [filters, setFilters] = useQueryStates(employeeFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadEmployeeFilterParams = createLoader(employeeFilterParams);

