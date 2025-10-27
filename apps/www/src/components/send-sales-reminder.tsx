import { Button } from "@gnd/ui/button";
import { AlertDialog, InputGroup, Item } from "@gnd/ui/composite";
import { Icons } from "@gnd/ui/icons";
import { useState, useTransition } from "react";
import { useEffect } from "react";
import { useQuery } from "@gnd/ui/tanstack";
import { useFieldArray } from "react-hook-form";

import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { SendSalesReminderPayload } from "@jobs/schema";
import { useZodForm } from "@/hooks/use-zod-form";
import { _trpc } from "@/components/static-trpc";
import z from "zod";
import { formatMoney, percentageValue, sum, uniqueList } from "@gnd/utils";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { ButtonGroup } from "@gnd/ui/button-group";
import { useAuth } from "@/hooks/use-auth";
import { SalesPaymentTokenSchema, SalesPdfToken } from "@gnd/utils/tokenizer";
import { generateToken } from "@/actions/token-action";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { addDays } from "date-fns";
import { SalesPrintModes } from "@sales/constants";
interface Props {
    children?;
    salesIds: number[];
}
const defaultValues = {
    sales: [],
};
export function SendSalesReminder({ children, salesIds }: Props) {
    const [opened, setOpened] = useState(false);

    const form = useZodForm(
        z.object({
            sales: z.array(
                z.object({
                    ids: z.array(z.number()),
                    salesNos: z.array(z.string()),
                    includePaymentLink: z.boolean(),
                    email: z.string().min(1),
                    customerName: z.string().optional().nullable(),
                    type: z.string().optional().nullable(),
                    amount: z.number(),
                    percentage: z.number().optional().nullable(),
                    totalAmount: z.number().optional().nullable(),
                })
            ),
        }),
        {
            defaultValues,
        }
    );
    const auth = useAuth();
    const trigger = useTaskTrigger({
        onStarted() {
            setOpened(false);
            form.reset(defaultValues);
        },
    });
    const [isTokenPending, startTransition] = useTransition();
    const submit = async (data) => {
        startTransition(async () => {
            const payload: SendSalesReminderPayload = {
                salesRepEmail: auth.email,
                salesRep: auth.name,
                sales: [],
            };
            for (const sale of data.sales) {
                const mode = "order" as SalesPrintModes;
                const downloadToken = await generateToken({
                    salesIds: sale.ids,
                    expiry: addDays(new Date(), 7).toISOString(),
                    mode,
                } satisfies SalesPdfToken);
                const paymentToken = sale.includePaymentLink
                    ? await generateToken({
                          salesIds: sale.ids,
                          expiry: addDays(new Date(), 7).toISOString(),
                          percentage: sale.percentage,
                          amount: sale.amount,
                      } satisfies SalesPaymentTokenSchema)
                    : null;
                console.log({ paymentToken });
                payload.sales.push({
                    type: sale.type,
                    salesIds: sale.ids,
                    customerEmail: sale.email,
                    customerName: sale.customerName,
                    downloadToken,
                    paymentToken,
                });
            }
            return;
            trigger.trigger({
                taskName: "send-sales-reminder",
                payload,
            });
        });
    };
    const { fields, append, update } = useFieldArray({
        control: form.control,
        name: "sales",
        keyName: "_id",
    });
    // const {  } = form.watch();
    const { data, isPending } = useQuery(
        _trpc.sales.getOrders.queryOptions(
            {
                salesIds: salesIds,
            },
            {
                enabled: !!salesIds?.length && opened,
            }
        )
    );
    const {
        formState: { isValid },
    } = form;
    // isSubmitting
    useEffect(() => {
        console.log(data);
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
                        customerName: sale?.displayName,
                        includePaymentLink: true,
                        type: sale.type,
                    };
                }),
                "email"
            ),
        });
    }, [data]);
    const isDisabled =
        trigger.isActionPending || !isValid || isPending || isTokenPending;
    return (
        <AlertDialog
            open={opened}
            onOpenChange={(e) => {
                setOpened(e);
            }}
        >
            <AlertDialog.Trigger asChild>
                {children || (
                    <Button
                        size="sm"
                        variant="secondary"
                        className="flex items-center space-x-2 hover:bg-secondary flex-1"
                    >
                        <Icons.Notifications className="size-3.5" />
                        <span>Remind</span>
                    </Button>
                )}
            </AlertDialog.Trigger>
            <Form {...form}>
                <AlertDialog.Content className="min-w-max">
                    <AlertDialog.Header>
                        <AlertDialog.Title>Send Reminder</AlertDialog.Title>
                        <AlertDialog.Description>
                            Are you sure you want to send a reminder for this
                            invoice?
                        </AlertDialog.Description>
                    </AlertDialog.Header>
                    {!isPending || <Skeletons.Card />}
                    {fields.map((field, fi) => (
                        <div
                            key={field._id}
                            className="p-2 grid grid-cols-2s gap-4"
                        >
                            <Item className="" variant="outline" size="sm">
                                <Item.Content>
                                    <Item.Title>
                                        {field.email || <div>set email</div>}
                                        {" | "} {field.salesNos?.join(", ")}
                                    </Item.Title>
                                    <Item.Description>
                                        {field.customerName}
                                    </Item.Description>
                                    <div className="p-2  grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Percentage</Label>
                                            <ButtonGroup>
                                                {[25, 50, 75, 100].map(
                                                    (a, i) => (
                                                        <Button
                                                            onClick={(e) => {
                                                                update(fi, {
                                                                    ...field,
                                                                    amount: percentageValue(
                                                                        field.totalAmount,
                                                                        a
                                                                    ),
                                                                    percentage:
                                                                        a,
                                                                });
                                                            }}
                                                            key={a}
                                                            className="whitespace-nowrap"
                                                            variant={
                                                                field.percentage ===
                                                                a
                                                                    ? "destructive"
                                                                    : "outline"
                                                            }
                                                            size="sm"
                                                        >
                                                            {a} %
                                                        </Button>
                                                    )
                                                )}
                                            </ButtonGroup>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Amount</Label>
                                            <InputGroup>
                                                <InputGroup.Input
                                                    value={field.amount}
                                                    placeholder="Amount"
                                                />
                                                <InputGroup.Addon align="inline-end">
                                                    /$
                                                    {formatMoney(
                                                        field.totalAmount
                                                    )}
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
                                </Item.Content>
                                {/* <Item.Actions>
                                    <Button variant="link" size="xs">
                                        <span>Change Email</span>
                                    </Button>
                                </Item.Actions> */}
                            </Item>
                        </div>
                    ))}
                    <AlertDialog.Footer>
                        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                        <form
                            onSubmit={form.handleSubmit(submit, (error) => {
                                console.log(error);
                            })}
                        >
                            <AlertDialog.Action
                                type="submit"
                                onClick={(e) => {
                                    e.preventDefault();
                                    submit(form.getValues());
                                }}
                                disabled={isDisabled}
                            >
                                Send Reminder
                            </AlertDialog.Action>
                        </form>
                    </AlertDialog.Footer>
                </AlertDialog.Content>
            </Form>
        </AlertDialog>
    );
}

