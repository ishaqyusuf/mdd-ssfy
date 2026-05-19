import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";
import { RouterInputs } from "@api/trpc/routers/_app";
type FilterKeys = keyof Exclude<RouterInputs["hrm"]["getEmployees"], void>;

export const employeeSearchFilterParams = {
	q: parseAsString,
	role: parseAsString,
	profile: parseAsString,
} satisfies Partial<Record<FilterKeys, any>>;

export const employeeFilterParams = {
	...employeeSearchFilterParams,
	accessStatus: parseAsStringLiteral([
		"active",
		"revoked",
	] as const).withDefault("active"),
} satisfies Partial<Record<FilterKeys, any>>;

export function useEmployeeFilterParams() {
	const [filters, setFilters] = useQueryStates(employeeFilterParams);
	return {
		filters,
		setFilters,
		hasFilters: [filters.q, filters.role, filters.profile].some(
			(value) => value !== null,
		),
	};
}
export const loadEmployeeFilterParams = createLoader(employeeFilterParams);
