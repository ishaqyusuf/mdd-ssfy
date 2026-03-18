"use client";

import { Button } from "@gnd/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

interface Props {
    recordId: number;
    onApprove?: (id: number) => void;
    onReject?: (id: number, notes: string) => void;
}

export function RecordApprovalActions({
    recordId,
    onApprove,
    onReject,
}: Props) {
    return (
        <div className="flex gap-2">
            {onApprove && (
                <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1 text-green-600 hover:text-green-700"
                    onClick={() => onApprove(recordId)}
                >
                    <CheckCircle className="h-3 w-3" />
                    Approve
                </Button>
            )}
            {onReject && (
                <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1 text-destructive hover:text-destructive"
                    onClick={() => onReject(recordId, "")}
                >
                    <XCircle className="h-3 w-3" />
                    Reject
                </Button>
            )}
        </div>
    );
}
