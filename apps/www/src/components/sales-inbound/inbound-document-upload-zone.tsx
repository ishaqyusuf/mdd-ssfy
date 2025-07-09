import { useTRPC } from "@/trpc/client";
import { useState } from "react";

export function InboundDocumentUploadZone() {
    const trpc = useTRPC();
    const [progress, setProgress] = useState(0);
    const [showProgress, setShowProgress] = useState(false);
}

