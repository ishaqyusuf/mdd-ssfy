import {
    createContext as createContextBase,
    useContext as useContextBase,
} from "react";
import { createContextFactory } from "@/utils/context-factory";
import { CheckCircle, ClipboardList, Clock } from "lucide-react";

import { Badge } from "@gnd/ui/badge";

import { useProductionAssignments } from "./production-assignments";

const { useContext: useAssignmentRow, Provider: AssignmentRowProvider } =
    createContextFactory(function (index: number) {
        const ctx = useProductionAssignments();
        const assignment = ctx?.data?.assignments[index];
        console.log(ctx?.data);

        return {
            assignment,
        };
    });
export function ProductionAssignmentRow({ index }) {
    return (
        <AssignmentRowProvider args={[index]}>
            <Content />
        </AssignmentRowProvider>
    );
}
function Content() {
    const ctx = useAssignmentRow();
    const { assignment } = ctx;
    return (
        <div className="space-y-3 border border-border p-3">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium">
                        {assignment.assignedTo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Qty: {assignment.qty?.qty}
                    </p>
                </div>
                <Badge
                    variant={
                        assignment.status === "completed"
                            ? "success"
                            : assignment.status === "in progress"
                              ? "default"
                              : "outline"
                    }
                >
                    {assignment.status === "completed" ? (
                        <CheckCircle className="mr-1 h-3 w-3" />
                    ) : assignment.status === "in progress" ? (
                        <Clock className="mr-1 h-3 w-3" />
                    ) : (
                        <ClipboardList className="mr-1 h-3 w-3" />
                    )}
                    {assignment.status.replace("-", " ")}
                </Badge>
            </div>
        </div>
    );
}
