"use client";

import Button from "@/components/common/button";

export function EmptyState() {
    return (
        <div className="flex items-center justify-center ">
            <div className="mt-40 flex flex-col items-center">
                <div className="mb-6 space-y-2 text-center">
                    <h2 className="text-lg font-medium">No commission</h2>
                    <p className="text-sm text-[#606060]">
                        You haven{"'"}t created any invoices yet. <br />
                        Go ahead and create your first one.
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={() => {
                        //  setParams({
                        //   createStudent: true,
                        // })
                    }}
                >
                    Create Student
                </Button>
            </div>
        </div>
    );
}

export function NoResults() {
    // const [params, setParams] = useQueryStates({
    //     ...studentPageQuery,
    // });
    // const q = useStudentParams();
    return (
        <div className="flex items-center justify-center ">
            <div className="mt-40 flex flex-col items-center">
                <div className="mb-6 space-y-2 text-center">
                    <h2 className="text-lg font-medium">No results</h2>
                    <p className="text-sm text-[#606060]">
                        Try another search, or adjusting the filters
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={() => {
                        // q.setParams({
                        //     createStudent: true,
                        // });
                    }}
                >
                    Create
                </Button>
            </div>
        </div>
    );
}
