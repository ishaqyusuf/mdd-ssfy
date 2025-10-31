"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

export default function CustomerMerger({}) {
    const r = useParams();
    useEffect(() => {
        console.log({
            params: r,
        });
    }, [r]);

    return <div className=""> </div>;
}
