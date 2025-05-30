"use client";

import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";

import { copyDykeSales } from "../../_actions/copy-dyke-sale";

export default function CopyFn() {
    return <></>;
    async function _copy() {
        try {
            const r = await copyDykeSales(`24-0503-1517`, "order");
            console.log(r);
            await toast.success("copied");
            await _revalidate("orders");
        } catch (error) {
            if (error instanceof Error) console.log(error.message);
        }
    }
    return (
        <>
            <Button onClick={_copy}>Copy</Button>
        </>
    );
}
