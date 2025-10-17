"use client";

import { use, useEffect } from "react";
import { usePrintContext } from "../base-printer";

interface Props {
    action;
    slug;
}
export default function ReportBlock({ action, slug }: Props) {
    const data = use(action);
    const ctx = usePrintContext();
    useEffect(() => {
        if (data) ctx.pageReady(slug, data);
    }, [data]);

    return <div id={`customerReport-${slug}`}></div>;
}
