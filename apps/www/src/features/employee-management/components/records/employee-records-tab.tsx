"use client";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { EmployeeRecord } from "../../types";
import { FileText, Upload } from "lucide-react";
import { cn } from "@gnd/ui/cn";

const statusVariants: Record<
    string,
    "default" | "destructive" | "secondary" | "outline"
> = {
    approved: "default",
    rejected: "destructive",
    pending: "outline",
};

interface Props {
    records: EmployeeRecord[];
    onUpload?: () => void;
}

export function EmployeeRecordsTab({ records, onUpload }: Props) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">
                    Documents & Records
                </CardTitle>
                {onUpload && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onUpload}
                        className="flex items-center gap-1"
                    >
                        <Upload className="h-3 w-3" />
                        Upload
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {records.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No records on file.
                    </p>
                ) : (
                    <div className="divide-y">
                        {records.map((record) => (
                            <div
                                key={record.id}
                                className="flex items-center gap-3 py-3 text-sm"
                            >
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="flex flex-1 flex-col gap-0.5">
                                    <span className="font-medium">
                                        {record.title}
                                    </span>
                                    <span className="text-xs capitalize text-muted-foreground">
                                        {record.type.replace("-", " ")}
                                        {record.expiresAt &&
                                            ` · Expires ${record.expiresAt}`}
                                    </span>
                                </div>
                                <Badge
                                    variant={statusVariants[record.status]}
                                    className="capitalize"
                                >
                                    {record.status}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
