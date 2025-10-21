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
import z, { nullable } from "zod";
import { ButtonGroup } from "@gnd/ui/button-group";
import { Button } from "@gnd/ui/button";
import { calculatePercentile } from "@/lib/request/percentile";
import { formatMoney, percentageValue, sum, uniqueList } from "@gnd/utils";
import { Label } from "@gnd/ui/label";
import { InputGroup } from "@gnd/ui/composite";
import { Send, X } from "lucide-react";
import { _trpc } from "@/components/static-trpc";
import { useEffect } from "react";
import { useQuery } from "@gnd/ui/tanstack";
import { useSendSalesEmail } from "@/hooks/use-send-sales-email";
import { useFieldArray } from "react-hook-form";
import { SubmitButton } from "../submit-button";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { SendSalesEmailPayload } from "@jobs/schema";
export function SendSalesEmailModal({}) {
    const {
        params: { sendEmailSalesId },
        setParams,
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
    const sendEmail = () => {
        //    mailer.send({
        //        emailType: "without payment",
        //        salesIds: [salesId],
        //        printType: type,
        //    });
    };
    const trigger = useTaskTrigger({});
    const submit = () => {
        trigger.trigger({
            taskName: "send-sales-email",
            payload: {} as SendSalesEmailPayload,
        });
    };
    const { fields, append } = useFieldArray({
        control: form.control,
        name: "sales",
        keyName: "_id",
    });
    // const {  } = form.watch();
    const { data, isPending } = useQuery(
        _trpc.sales.getOrders.queryOptions(
            {
                salesIds: sendEmailSalesId,
            },
            {
                enabled: !!sendEmailSalesId?.length,
            }
        )
    );
    // isSubmitting
    useEffect(() => {
        // console.log(data);
        if (!data || isPending) return;
        form.reset({
            sales: uniqueList(
                data?.data?.map((sale) => {
                    const common = data.data.filter((a) =>
                        sale.email ? a.email === sale.email : a.id == sale.id
                    );
                    return {
                        ids: common.map((a) => a.id),
                        salesNos: common.map((a) => a.orderId),
                        totalAmount: sum(common, "due"),
                        amount: sum(common, "due"),
                        percentage: 100,
                        email: sale.email,
                    };
                }),
                "email"
            ),
        });
    }, [data]);
    return (
        <Dialog
            onOpenChange={(e) => {
                // ctx.close();
                setParams(null);
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
                        {fields.map((field, fi) => (
                            <div
                                key={field._id}
                                className="p-2 w-[250pxs] grid grid-cols-2 gap-4"
                            >
                                <div className="grid gap-4">
                                    <Label>Percentage</Label>
                                    <ButtonGroup>
                                        {[25, 50, 75, 100].map((a, i) => (
                                            <Button
                                                onClick={(e) => {
                                                    form.setValue(
                                                        `sales.${fi}.amount`,
                                                        percentageValue(
                                                            field.totalAmount,
                                                            a
                                                        )
                                                    );
                                                    form.setValue(
                                                        `sales.${fi}.percentage`,
                                                        a
                                                    );
                                                }}
                                                key={a}
                                                variant={
                                                    field.percentage === a
                                                        ? "destructive"
                                                        : "outline"
                                                }
                                                // size="sm"
                                            >
                                                {a} %
                                            </Button>
                                        ))}
                                    </ButtonGroup>
                                </div>
                                <div className="grid gap-4">
                                    <Label>Amount</Label>
                                    <InputGroup>
                                        <InputGroup.Input
                                            value={field.amount}
                                            placeholder="Amount"
                                        />
                                        <InputGroup.Addon align="inline-end">
                                            /${formatMoney(field.totalAmount)}
                                        </InputGroup.Addon>
                                    </InputGroup>
                                </div>
                                <div className="flex col-span-2">
                                    <div className="flex-1"></div>
                                    {/* <SubmitButton
                                        isSubmitting={isSubmitting}
                                        size="icon"
                                        aria-label="Submit"
                                    >
                                        <Send className="size-4" />
                                    </SubmitButton> */}
                                </div>
                            </div>
                        ))}
                    </Form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

