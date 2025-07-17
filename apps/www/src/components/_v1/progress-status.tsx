"use client";

import { Progressor, getProgress } from "@/lib/status";
import { useEffect, useState } from "react";
import { Progress } from "@gnd/ui/progress";
import StatusBadge from "./status-badge";

interface Props {
    status?;
    score?;
    total?;
    fallBackStatus?;
    color?;
    noDot?: boolean;
}

export default function ProgressStatus({
    status,
    score,
    total,
    color,
    fallBackStatus = "Unknown",
    noDot,
}: Props) {
    const [progress, setProgress] = useState<Progressor | null>({} as any);
    useEffect(() => {
        setProgress(getProgress(score, total));
    }, [score, total, status]);
    if (progress?.total)
        return (
            <div className="w-20">
                {/* {progress.percentage > 0 && ( */}
                <p>
                    <Progress
                        value={progress.percentage || 1}
                        color={color || progress.color}
                        className="h-2"
                    />
                </p>

                {/* )} */}
                {status && (
                    <p className="text-sm text-muted-foreground">{status}</p>
                )}
            </div>
        );
    return (
        <StatusBadge
            color={color}
            noDot={noDot}
            status={status || fallBackStatus}
        />
    );
}
