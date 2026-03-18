// Placeholder hooks for employee overview data.
// Wire up to tRPC once employees.route.ts procedures are implemented.

export function useEmployeeOverview(_employeeId: number) {
    return {
        data: null as null,
        isLoading: false,
        error: null,
    };
}
