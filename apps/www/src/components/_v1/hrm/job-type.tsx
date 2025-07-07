"use client";

import { IJobs } from "@/types/hrm";
import { useState } from "react";
import StatusBadge from "../status-badge";
import { Badge } from "@gnd/ui/badge";

export default function JobType({ job }: { job: IJobs }) {
    const [type, setType] = useState(
        {
            installation: "install",
            punchout: "punchout",
            "Deco-Shutter": "deco",
        }[job.type],
    );

    return (
        <Badge className="px-1 leading-none" variant={"outline"}>
            {type}
        </Badge>
    );
}
