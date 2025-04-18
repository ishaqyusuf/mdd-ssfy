import { formatDate } from "@/lib/use-day";

import { useAssignmentRow } from "./production-assignment-row";

export function ProductionSubmissions({}) {
    const ctx = useAssignmentRow();
    const { assignment } = ctx;
    if (!assignment?.submissions?.length)
        return (
            <p className="py-1 text-center text-xs text-muted-foreground">
                No submissions yet
            </p>
        );
    return (
        <div className="space-y-2">
            {assignment.submissions.map((submission) => (
                <div
                    key={submission.id}
                    className="rounded-md bg-muted p-2 text-xs"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center">
                                <p className="font-medium">
                                    {submission.submittedBy ||
                                        assignment.assignedTo}
                                </p>
                                <p className="ml-2 text-muted-foreground">
                                    {submission.submitDate
                                        ? formatDate(submission.submitDate)
                                        : "No date"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
