"use client";
import useEffectLoader from "@/lib/use-effect-loader";
import { getSalesCustomerConflicts } from "./action";
import { useEffect } from "react";

export default function CustomerMerger({ customerId }) {
    const merger = useEffectLoader(
        async () => await getSalesCustomerConflicts(customerId)
    );
    useEffect(() => {
        //
    }, [merger.ready]);
    return null;
}
