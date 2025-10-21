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
import { Form } from "@gnd/ui/form";
import { useZodForm } from "@/hooks/use-zod-form";
import z from "zod";
import { ButtonGroup } from "@gnd/ui/button-group";
import { Button } from "@gnd/ui/button";
import { calculatePercentile } from "@/lib/request/percentile";
import { formatMoney, percentageValue } from "@gnd/utils";
import { Label } from "@gnd/ui/label";
import { InputGroup } from "@gnd/ui/composite";
import { Send, X } from "lucide-react";
import { _trpc } from "@/components/static-trpc";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSendSalesEmail } from "@/hooks/use-send-sales-email";
import { useFieldArray } from "react-hook-form";
export function SendSalesEmailModal({}) {
    const {
        params: { sendEmailSalesId },
    } = useSendSalesEmail();
    const form = useZodForm(
        z.object({
            sales: z.array(
                z.object({
                    ids: z.array(z.number()),
                    salesNos: z.array(z.string()),
                    email: z.string(),
                    amount: z.number(),
                    percentage: z.number().optional().nullable(),
                    totalAmount: z.number().optional().nullable(),
                })
            ),
        }),
        {
            defaultValues: {
                sales: [],
            },
        }
    );
    const { fields } = useFieldArray({
        control: form.control,
        name: "sales",
    });
    // const {  } = form.watch();
    const { data } = useQuery(
        _trpc.sales.index.queryOptions(
            {
                salesIds: sendEmailSalesId,
            },
            {
                // enabled: !!opened,
            }
        )
    );
    useEffect(() => {}, [data]);
    return (
        <Dialog
            onOpenChange={(e) => {
                // ctx.close();
            }}
            open={!!sendEmailSalesId?.length}
        >
            <DialogContent className="w-[800px]s max-w-4xls">
                <DialogHeader>
                    <DialogTitle>Sales Payment Plan Email</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <ScrollArea
                    className={cn(
                        "h-[90vh]s overflow-auto"
                        // !inboundCtx?.params?.inboundOrderId || "pb-24",
                    )}
                >
                    <Form {...form}>
                        <div className="p-2 w-[250pxs] grid gap-4">
                            <Label>Percentage</Label>
                            <ButtonGroup>
                                {[25, 50, 75].map((a, i) => (
                                    <Button
                                        onClick={(e) => {
                                            form.setValue(
                                                "amount",
                                                percentageValue(totalAmount, a)
                                            );
                                            form.setValue("percentage", a);
                                        }}
                                        key={a}
                                        variant={
                                            percentage === a
                                                ? "destructive"
                                                : "outline"
                                        }
                                        size="sm"
                                    >
                                        {a} %
                                    </Button>
                                ))}
                            </ButtonGroup>
                            <Label>Amount</Label>
                            <InputGroup>
                                <InputGroup.Input placeholder="Amount" />
                                <InputGroup.Addon align="inline-end">
                                    /${formatMoney(totalAmount)}
                                </InputGroup.Addon>
                            </InputGroup>
                            <div className="flex">
                                <Button
                                    onClick={(e) => {
                                        closeForm();
                                    }}
                                    size="icon"
                                    variant="destructive"
                                >
                                    <X className="size-4" />
                                </Button>
                                <div className="flex-1"></div>
                                <Button size="icon" aria-label="Submit">
                                    <Send className="size-4" />
                                </Button>
                            </div>
                        </div>
                    </Form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

