import { useQueryStates } from "nuqs";
import {
    parseAsStringEnum,
    createLoader,
    parseAsString,
    parseAsInteger,
} from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
import { JOBS_SHOW_OPTIONS } from "@community/constants";
type FilterKeys = keyof Exclude<RouterInputs["jobs"]["getJobs"], void>;

export const jobFilterParams = {
    q: parseAsString,
    show: parseAsStringEnum([...JOBS_SHOW_OPTIONS]),
    contractor: parseAsString,
    project: parseAsString,
    unitId: parseAsInteger,
} satisfies Partial<Record<FilterKeys, any>>;

export function useJobFilterParams() {
    const [filters, setFilters] = useQueryStates(jobFilterParams);
    return {
        filters,
        setFilters,
        hasFilters: Object.values(filters).some((value) => value !== null),
    };
}
export const loadJobFilterParams = createLoader(jobFilterParams);

