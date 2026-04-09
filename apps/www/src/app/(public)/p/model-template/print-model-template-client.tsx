"use client";

import { PrintLoading } from "@/components/print-loading";
import dynamic from "next/dynamic";

const PrintModelTemplate = dynamic(
    () =>
        import("@/components/print-model-template").then(
            (mod) => mod.PrintModelTemplate,
        ),
    {
        ssr: false,
        loading: () => <PrintLoading />,
    },
);

export function PrintModelTemplateClient() {
    return <PrintModelTemplate />;
}
