"use client";

import { useEffect, useState } from "react";
import useSalesPdf from "@/app/(v2)/printer/sales/use-sales-pdf";
import { generateRandomString } from "@/lib/utils";
// import { useDebounce } from "@/hooks/use-debounce";
import { useDebounce } from "use-debounce";

import { Button } from "@gnd/ui/button";

export default function SalesDownload({ id, mode }) {
    const pdf = useSalesPdf();
    const [query, setQuery] = useState("");
    const [debouncedQuery] = useDebounce(query, 800);
    useEffect(() => {
        setQuery(generateRandomString());
    }, []);
    useEffect(() => {
        pdf.print({
            slugs: id,
            mode: mode as any,
            pdf: true,
        });
    }, [debouncedQuery]);
    async function download() {
        pdf.print({
            slugs: id,
            mode: mode as any,
            pdf: true,
        });
    }
    return (
        <>
            <Button onClick={download}>Download</Button>
        </>
    );
}
