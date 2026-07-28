"use client";

import { useUnitInvoiceParams } from "@/hooks/use-unit-invoice-params";
import dynamic from "next/dynamic";

const UnitInvoiceModalContent = dynamic(() =>
    import("./unit-invoice-modal-content").then(
        (mod) => mod.UnitInvoiceModalContent,
    ),
);

export function UnitInvoiceModal() {
    const { editUnitInvoiceId } = useUnitInvoiceParams();

    return editUnitInvoiceId ? <UnitInvoiceModalContent /> : null;
}
