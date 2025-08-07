"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";

import { ScrollArea } from "@gnd/ui/scroll-area";
import { cn } from "@gnd/ui/cn";
import { useSalesPrintParams } from "../../hooks/use-sales-print-params";
import { SalesInvoiceView } from "../sales-printer";
import { Form } from "@gnd/ui/form";
import { useForm } from "react-hook-form";
import FormSelect from "../common/controls/form-select";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";

export function SalesInvoicePreviewModal({}) {
    const ctx = useSalesPrintParams();
    const form = useForm({
        defaultValues: {
            mode: ctx.params.mode,
            access: ctx.params.access == "internal" ? "private" : "public",
        },
    });
    const trpc = useTRPC();
    const qc = useQueryClient();
    return (
        <Dialog
            onOpenChange={(e) => {
                ctx.close();
            }}
            open={ctx.params?.modal}
        >
            <DialogContent className="w-[800px]s max-w-4xl">
                <DialogHeader>
                    <DialogTitle></DialogTitle>
                    <DialogDescription>
                        <Form {...form}>
                            <div className="flex">
                                <FormSelect
                                    className="w-28"
                                    control={form.control}
                                    options={["private", "public"]}
                                    name="access"
                                    onSelect={(e) => {
                                        ctx.setParams({
                                            access:
                                                e === "private"
                                                    ? "internal"
                                                    : e,
                                        });
                                        qc.invalidateQueries({
                                            queryKey:
                                                trpc.sales.printInvoice.queryKey(),
                                        });
                                    }}
                                    size="sm"
                                />
                                {ctx.params.type == "quote" || (
                                    <FormSelect
                                        className="w-28"
                                        control={form.control}
                                        onSelect={(e) => {
                                            ctx.setParams({
                                                mode: e,
                                            });
                                            qc.invalidateQueries({
                                                queryKey:
                                                    trpc.sales.printInvoice.queryKey(),
                                            });
                                            console.log(e);
                                        }}
                                        options={
                                            ctx.params.type == "quote"
                                                ? []
                                                : [
                                                      "production",
                                                      "packing list",
                                                      "invoice",
                                                  ]
                                        }
                                        name="mode"
                                        size="sm"
                                    />
                                )}
                            </div>
                        </Form>
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea
                    className={cn(
                        "h-[90vh] overflow-auto",
                        // !inboundCtx?.params?.inboundOrderId || "pb-24",
                    )}
                >
                    <SalesInvoiceView />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
