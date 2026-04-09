"use client";

import { IJobs } from "@/types/hrm";
import { useState } from "react";
import StatusBadge from "../status-badge";
import { Badge } from "@gnd/ui/badge";
import { Progress } from "@gnd/ui/custom/progress";

export default function JobType({ job }: { job: IJobs }) {
    const [type, setType] = useState(
        {
            installation: "install",
            punchout: "punchout",
            "Deco-Shutter": "deco",
        }[job.type]
    );
    return (
        <Progress.Status noDot badge>
            {job?.isCustom ? "Custom" : type}
        </Progress.Status>
    );
    return (
        <Badge className="px-1 leading-none" variant={"outline"}>
            {type}
        </Badge>
    );
}
