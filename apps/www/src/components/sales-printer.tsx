import { useTRPC } from "@/trpc/client";
import { useSalesPrintParams } from "../hooks/use-sales-print-params";
import { useQuery } from "@gnd/ui/tanstack";
import { SalesInvoiceHtmlTemplate } from "@sales/sales-template/html";
import { useEffect } from "react";
export function SalesInvoiceView({}) {
    const ctx = useSalesPrintParams();
    const trpc = useTRPC();
    const {
        data: printList,
        isPending,
        error,
    } = useQuery(
        trpc.sales.printInvoice.queryOptions(
            {
                ...(ctx.params as any),
            },
            {
                enabled: !!ctx.params.ids?.length || !!ctx.params.slugs?.length,
            },
        ),
    );
    useEffect(() => {
        console.log(error);
    }, [error]);
    return (
        <div className="">
            {printList?.map((data, i) => (
                <SalesInvoiceHtmlTemplate data={data as any} key={i} />
            ))}
        </div>
    );
}

