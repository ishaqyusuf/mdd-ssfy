"use client";

import { useQueryStates } from "nuqs";

import { Button } from "@gnd/ui/button";
import { useEmployeesParams } from "@/hooks/use-employee-params";
import { employeePageQuery } from "@/app/(sidebar)/hrm/employees/search-params";

export function EmptyState({}) {
    const { setParams } = useEmployeesParams();

    return (
        <div className="flex items-center justify-center ">
            <div className="mt-40 flex flex-col items-center">
                <div className="mb-6 space-y-2 text-center">
                    <h2 className="text-lg font-medium">No students</h2>
                    <p className="text-sm text-[#606060]">
                        You haven't created any invoices yet. <br />
                        Go ahead and create your first one.
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={() =>
                        setParams({
                            createEmployee: true,
                        })
                    }
                >
                    Create Student
                </Button>
            </div>
        </div>
    );
}

export function NoResults() {
    const [params, setParams] = useQueryStates({
        ...employeePageQuery,
    });
    const q = useEmployeesParams();
    return (
        <div className="flex items-center justify-center ">
            <div className="mt-40 flex flex-col items-center">
                <div className="mb-6 space-y-2 text-center">
                    <h2 className="text-lg font-medium">No results</h2>
                    <p className="text-sm text-[#606060]">
                        Try another search, or adjusting the filters
                    </p>
                </div>

                <Button variant="outline" onClick={() => setParams(null)}>
                    Clear Filter
                </Button>
            </div>
        </div>
    );
}
