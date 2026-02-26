import { cancelTerminaPaymentAction } from "@/actions/cancel-terminal-payment-action";
import { createSalesPaymentAction } from "@/actions/create-sales-payment";
import { terminalPaymentStatus } from "@/actions/get-terminal-payment-status";
import { createPaymentSchema } from "@/actions/schema";
import { generateToken, validateTokenAction } from "@/actions/token-action";
import { Env } from "@/components/env";
import { _qc, _trpc } from "@/components/static-trpc";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useZodForm } from "@/hooks/use-zod-form";
import { openLink } from "@/lib/open-link";
import { TerminalCheckoutStatus } from "@gnd/square";
import { paymentMethods, salesPaymentMethods } from "@/utils/constants";
import { formatDate } from "@/utils/format";
import { Button, ButtonProps } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import {
    Dialog,
    Field,
    InputGroup,
    Item,
    Popover,
    Select,
} from "@gnd/ui/namespace";
import { Icons } from "@gnd/ui/icons";
import { Menu } from "@gnd/ui/custom/menu";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Separator } from "@gnd/ui/separator";
import { Spinner } from "@gnd/ui/spinner";
import { ToastAction } from "@gnd/ui/toast";
import { toast } from "@gnd/ui/use-toast";
import { sum } from "@gnd/utils";
import { SalesPdfToken } from "@gnd/utils/tokenizer";
import NumberFlow from "@number-flow/react";
import { SalesPrintModes } from "@sales/constants";
import { useSuspenseQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { Calculator } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import React, { Suspense, useEffect, useState, useTransition } from "react";
import z from "zod";
import { sendSalesEmail } from "@gnd/sales/utils/email";
import { useAuth } from "@/hooks/use-auth";
import { useFieldArray } from "react-hook-form";
interface Props {
    selectedIds: number[];
    phoneNo: string;
    customerId?: number;
    children?;
    buttonProps?: ButtonProps;
    disabled?: boolean;
}

export function SalesPaymentProcessor(props: Props) {
    const [open, setOpened] = useState(false);
    return (
        <Dialog.Root open={open} onOpenChange={setOpened}>
            <Dialog.Trigger asChild>
                {props.children || (
                    <Button
                        disabled={props.disabled}
                        onClick={(e) => {
                            e.preventDefault();
                            setOpened(!open);
                        }}
                        className=""
                        {...props?.buttonProps}
                    >
                        <Icons.payment className="mr-2 size-4" />
                        Pay
                    </Button>
                )}
            </Dialog.Trigger>
            <Dialog.Content className="w-[450px]">
                <Suspense
                    fallback={
                        <>
                            <Dialog.Header>
                                <Dialog.Title></Dialog.Title>
                                <Dialog.Description></Dialog.Description>
                            </Dialog.Header>
                            <Skeletons.Card />
                        </>
                    }
                >
                    <Content setOpened={setOpened} {...props} />
                </Suspense>
            </Dialog.Content>
        </Dialog.Root>
    );
}
const formSchema = createPaymentSchema
    .merge(
        z.object({
            sendEmail: z.boolean().optional().nullable(),
            linkProcessed: z.boolean().optional().nullable(),
            print: z.boolean().optional().nullable(),
            paymentStatus: z
                .enum([
                    "processing",
                    "completed",
                    "failed",
                    "idle",
                    "cancelled",
                ])
                .optional()
                .nullable(),
            editPrice: z.boolean().default(false),
            sales: z.array(
                z.object({
                    id: z.number(),
                    selected: z.boolean(),
                }),
            ),
        }),
    )
    .superRefine((data, ctx) => {
        if (data?.sales?.filter((s) => s.selected).length == 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Select at least one sale to proceed",
            });
        }
    });
function Content(props: Props & { setOpened }) {
    const accountNo = props.phoneNo ?? `cust-${props.customerId}`;
    const { data, error, isPending, refetch } = useSuspenseQuery(
        _trpc.customers.getCustomerPayPortal.queryOptions({
            accountNo,
        }),
    );
    const form = useZodForm(formSchema, {
        defaultValues: {},
    });
    useEffect(() => {
        console.log(data.error);

        if (data.error.terminal) {
            toast({
                title: "Unable to load PoS",
                variant: "destructive",
                footer: (
                    <div className="">
                        <ToastAction
                            altText="Yes"
                            onClick={(e) => {
                                refetch();
                            }}
                            className=""
                        >
                            Retry
                        </ToastAction>
                    </div>
                ),
            });
        }

        form.reset({
            deviceId: data?.lastTerminalId,
            terminalPaymentSession: null,
            sales: data.pendingSales.map((s) => ({
                id: s.id,
                selected: props.selectedIds.includes(s.id),
            })),
            accountNo,
            paymentMethod: data?.lastPaymentMethod || "terminal",
        });
    }, [data]);
    const { fields: salesFields, update: updateSalesField } = useFieldArray({
        control: form.control,
        name: "sales",
        keyName: "fieldId",
    });
    const {
        sales: wSales,
        paymentMethod: pm,
        amount,
        editPrice,
        terminalPaymentSession,
        paymentStatus,
        linkProcessed,
    } = form.watch();
    useEffect(() => {
        // console.log({ paymentStatus });
        if (!paymentStatus) return;
        switch (paymentStatus) {
            case "cancelled":
                toast({
                    title: "Payment Cancelled",
                    description: "The payment has been cancelled.",
                    duration: 3000,
                    variant: "destructive",
                });
                form.setValue("paymentStatus", null);
                break;
            case "processing":
                if (terminalPaymentSession)
                    toast({
                        title: "Terminal Payment",
                        description:
                            "Please complete the payment on your terminal device.",
                        duration: 3000,
                        variant: "spinner",
                    });
                else
                    toast({
                        title: "Payment Processing",
                        description:
                            "Your payment is being processed. Please wait...",
                        duration: 3000,
                        variant: "spinner",
                    });
                break;
            case "completed":
                toast({
                    title: "Payment Successful",
                    description: "The payment has been completed successfully.",
                    duration: 3000,
                    variant: "success",
                });
                _qc.invalidateQueries({
                    queryKey: _trpc.sales.getOrders.infiniteQueryKey({}),
                });
                const { print, sendEmail } = form.getValues();
                if (sendEmail) {
                    // await sendSalesEmail();
                }
                if (print)
                    (async () => {
                        const tok = await generateToken({
                            salesIds: form.getValues("sales").map((s) => s.id),
                            expiry: addDays(new Date(), 7).toISOString(),
                            mode: "order" as SalesPrintModes,

                            // mode: props.type
                        } satisfies SalesPdfToken);
                        openLink(
                            `api/download/sales`,
                            {
                                token: tok,
                                preview: true,
                            },
                            true,
                        );
                        props.setOpened(false);
                    })();
                else props.setOpened(false);

                break;
            case "failed":
                toast({
                    title: "Payment Failed",
                    description:
                        "There was an issue processing your payment. Please try again.",
                    duration: 3000,
                    variant: "destructive",
                });
                break;
        }
    }, [paymentStatus, terminalPaymentSession]);
    useEffect(() => {
        if (!salesFields?.length) return;
        form.setValue(
            "amount",
            sum(
                // wSales.filter(a => a.selected),
                data?.pendingSales?.filter(
                    (a) => wSales?.find((b) => b.id == a.id)?.selected,
                ),
                "amountDue",
            ),
        );
    }, [salesFields, data]);
    const makePayment = useAction(createSalesPaymentAction, {
        onSuccess: (args) => {
            if (args.data?.terminalPaymentSession) {
                form.setValue(
                    "terminalPaymentSession",
                    args.data.terminalPaymentSession,
                );
                setTimeout(() => {
                    setWaitSeconds(0);
                }, 2000);
            } else {
                if (args.data.status) {
                    form.setValue("paymentStatus", "completed");
                }
            }
        },
        onError(error) {
            form.setValue("paymentStatus", "failed");
            toast({
                title: "Payment Failed",
                description: error.error?.serverError,
                duration: 5000,
                variant: "destructive",
            });
            setTimeout(() => {
                form.setValue("paymentStatus", null);
            }, 3000);
        },
    });
    const [waitSeconds, setWaitSeconds] = useState(null);
    const cancelTerminalPayment = useAction(cancelTerminaPaymentAction, {
        onSuccess: (args) => {
            setWaitSeconds(null);
            form.setValue("paymentStatus", "cancelled");
            // form.setValue("terminalPaymentSession", null);
        },
        onError(e) {
            //toast.error("Unable to cancel payment");
            toast({
                title: "Cancellation Failed",
                description: "Unable to cancel payment. Please try again.",
                duration: 5000,
                variant: "destructive",
            });
        },
    });

    const trigger = useTaskTrigger({
        onStarted() {
            // setOpened(false);
            // form.reset(defaultValues);
        },
    });
    const getAmount = (formData: z.infer<typeof formSchema>) => {
        if (formData?.editPrice && isNaN(+formData._amount)) {
            toast({
                title: "Invalid amount",
                variant: "destructive",
            });
            return;
        }
        return formData?.editPrice ? +formData?._amount : formData?.amount;
    };
    const initPayment = async (formData: z.infer<typeof formSchema>) => {
        form.setValue("paymentStatus", "processing");
        setMockStatus(null);
        const amount = getAmount(formData);
        if (!amount) return;
        makePayment.execute({
            ...formData,
            amount,
            salesIds: formData.sales.filter((s) => s.selected).map((s) => s.id),
            orderNos: data?.pendingSales
                ?.filter(
                    (s) => formData.sales.find((b) => b.id == s.id)?.selected,
                )
                .map((s) => s.orderId),
        });
    };
    const auth = useAuth();
    const sendPaymentLink = (formData: z.infer<typeof formSchema>) => {
        // const emails = formData?.
        const amount = getAmount(formData);
        if (!amount) return;
        startTransition(async () => {
            const sales = data?.pendingSales?.filter(
                (s) => formData.sales.find((b) => b.id == s.id)?.selected,
            );

            if (sales.length > 1) {
                toast({
                    title: "Feature not available",
                    description:
                        "Payment link can only be sent for single sale at the moment.",
                    variant: "destructive",
                });
                return;
            }
            const cData = sales?.find(
                (s) => !!s.customerName && !!s?.customerEmail,
            );
            if (!cData?.customerEmail) {
                toast({
                    title: "No customer email",
                    description:
                        "Selected sales do not have a valid customer email.",
                    variant: "destructive",
                });
                return;
            }
            await sendSalesEmail({
                auth,
                tokenGeneratorFn: generateToken,
                validateTokenFn: validateTokenAction,
                trigger,
                data: [
                    {
                        customer: {
                            name: cData?.customerName,
                            email: cData?.customerEmail,
                        },
                        walletId: data.wallet?.id,
                        amount,
                        type: "order",
                        mode: "order",
                        ids: sales.map((a) => a.id),
                    },
                ],
            });
        });
    };
    const [mockStatus, setMockStatus] = useState<TerminalCheckoutStatus>(null);
    useEffect(() => {
        if (!terminalPaymentSession) return;
        async function checkTerminalPaymentStatus() {
            const rep = mockStatus
                ? { status: mockStatus }
                : await terminalPaymentStatus(
                      terminalPaymentSession?.squareCheckoutId,
                  );
            console.log({ rep });
            switch (rep.status) {
                case "COMPLETED":
                    form.setValue("terminalPaymentSession.status", "COMPLETED");
                    makePayment.execute({
                        ...form.getValues(),
                    });
                    return null;
                case "CANCELED":
                case "CANCEL_REQUESTED":
                    // cancelTerminalPayment.execute({
                    //     checkoutId: terminalPaymentSession.squareCheckoutId,
                    //     squarePaymentId: terminalPaymentSession.squarePaymentId,
                    // });
                    __cancel();
                    return null;
            }
            // return generateRandomString();
            setTimeout(() => {
                setWaitSeconds(waitSeconds + 1);
            }, 2000);
        }
        if (waitSeconds != null) {
            checkTerminalPaymentStatus();
        }
    }, [waitSeconds, terminalPaymentSession, mockStatus]);
    function __cancel() {
        const tps = {
            ...(terminalPaymentSession || {}),
        };
        form.setValue("terminalPaymentSession", null);
        form.setValue("paymentStatus", "cancelled");
        setTimeout(() => {
            cancelTerminalPayment.execute({
                checkoutId: tps?.squareCheckoutId,
                squarePaymentId: tps?.squarePaymentId,
            });
        }, 100);
    }
    const percentageList = [25, 50, 75, 100];

    const [sendingLink, startTransition] = useTransition();

    const sendLink = pm == "link" && !linkProcessed;
    return (
        <Form {...form}>
            <Dialog.Header>
                <Dialog.Title>
                    {data?.pendingSales?.[0]?.customerName}
                </Dialog.Title>
                <Dialog.Description>
                    {data?.wallet?.accountNo}
                    {/* {data?.pendingSales?.[0]?.customerName} */}
                </Dialog.Description>
            </Dialog.Header>
            <form
                onSubmit={form.handleSubmit(
                    (formData: any) => {
                        if (sendLink) {
                            sendPaymentLink(formData);
                        } else {
                            initPayment(formData);
                        }
                    },
                    (e) => {
                        console.log("Form Errors: ", e);
                    },
                )}
            >
                <div className="grid gap-4">
                    <ScrollArea className="max-h-[45vh]">
                        <Item.Group className="grid grid-cols-2s gap-2">
                            {data?.pendingSales?.map((sale, index) => (
                                <React.Fragment key={sale?.id}>
                                    <Item
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                            updateSalesField(index, {
                                                ...salesFields?.[index],
                                                selected:
                                                    !salesFields?.[index]
                                                        ?.selected,
                                            });
                                            // form.setValue(
                                            //     `sales.${index}.selected`,
                                            //     !salesFields?.[index]?.selected
                                            // );
                                        }}
                                        className={cn(
                                            !salesFields?.[index]?.selected ||
                                                "bg-green-100 border-green-500",
                                            "cursor-pointer p-2",
                                        )}
                                    >
                                        <Item.Content className="flex-row justify-between">
                                            <Item.Title
                                                className={cn(
                                                    "text-accents inline-flex",
                                                )}
                                            >
                                                {sale?.orderId}
                                            </Item.Title>
                                            <Item.Description
                                                className={cn(
                                                    "text-secondary-foregrounds flex gap-2 items-center",
                                                )}
                                            >
                                                <span>
                                                    {formatDate(
                                                        sale?.createdAt,
                                                    )}
                                                </span>
                                                {/* <Separator orientation="vertical" /> */}
                                                <>-</>
                                                <span>${sale?.amountDue}</span>
                                            </Item.Description>
                                        </Item.Content>
                                    </Item>
                                </React.Fragment>
                            ))}
                        </Item.Group>
                    </ScrollArea>
                    <Separator />
                    <div className="flex gap-2 items-center">
                        <div className=""></div>
                        <div className="flex-1"></div>
                        {editPrice ? (
                            <>
                                <Menu Icon={Calculator}>
                                    {percentageList.map((p) => (
                                        <Menu.Item onClick={(e) => {}} key={p}>
                                            {p} %
                                        </Menu.Item>
                                    ))}
                                </Menu>
                                <InputGroup className="w-48 pr-2">
                                    <InputGroup.Input
                                        {...form.register("_amount")}
                                        placeholder="Custom Price"
                                    />
                                    <InputGroup.Addon align="inline-end">
                                        <InputGroup.Text>
                                            / ${amount}
                                        </InputGroup.Text>
                                    </InputGroup.Addon>
                                </InputGroup>
                                <Button
                                    onClick={(e) => {
                                        form.setValue("editPrice", null);
                                        form.setValue("_amount", null);
                                    }}
                                    size="xs"
                                    variant="ghost"
                                >
                                    <Icons.X className="size-4" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <span className="font-bold">
                                    Total: ${amount}
                                </span>
                                <Button
                                    onClick={(e) => {
                                        form.setValue("editPrice", true);
                                    }}
                                    className=""
                                    size="icon"
                                    variant="ghost"
                                >
                                    <Icons.edit className="size-4" />
                                </Button>
                            </>
                        )}
                    </div>
                    <Separator />
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-2">
                            <Field orientation="horizontal">
                                <Checkbox
                                    disabled
                                    checked={
                                        form.getValues("sendEmail") ?? false
                                    }
                                    onCheckedChange={(checked) =>
                                        form.setValue("sendEmail", !!checked)
                                    }
                                    id="send-email"
                                />
                                <Field.Content>
                                    <Field.Label
                                        htmlFor="send-email"
                                        className="font-normal"
                                    >
                                        Notify Customer
                                    </Field.Label>
                                </Field.Content>
                            </Field>

                            <Field orientation="horizontal">
                                <Checkbox
                                    checked={form.getValues("print") ?? false}
                                    onCheckedChange={(checked) =>
                                        form.setValue("print", !!checked)
                                    }
                                    id="print-copy"
                                    defaultChecked
                                />
                                <Field.Content>
                                    <Field.Label
                                        htmlFor="print-copy"
                                        className="font-normal"
                                    >
                                        Print Copy
                                    </Field.Label>
                                </Field.Content>
                            </Field>
                        </div>
                        {pm != "link" || (
                            <div className="">
                                <Field orientation="horizontal">
                                    <Checkbox
                                        checked={
                                            form.getValues("linkProcessed") ??
                                            false
                                        }
                                        onCheckedChange={(checked) =>
                                            form.setValue(
                                                "linkProcessed",
                                                !!checked,
                                            )
                                        }
                                        id="paid"
                                    />
                                    <Field.Content>
                                        <Field.Label
                                            htmlFor="paid"
                                            className="font-normal"
                                        >
                                            Payment already received.
                                        </Field.Label>
                                        <Field.Description className="font-normal">
                                            This will mark payment as paid
                                            successful. Customer will not
                                            receive a payment link.
                                        </Field.Description>
                                    </Field.Content>
                                </Field>
                            </div>
                        )}
                    </div>
                    <Separator />
                    <div className="flex items-center gap-2">
                        {terminalPaymentSession ? (
                            <>
                                <Spinner />
                                <Label>
                                    Waiting for payment...{" "}
                                    <NumberFlow value={1} />
                                </Label>
                                <div className="flex-1"></div>
                                <Env isDev>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={(e) =>
                                                setMockStatus("CANCELED")
                                            }
                                            className="rounded-full "
                                            size="icon"
                                            variant="destructive"
                                        >
                                            <Icons.X className="size-4" />
                                        </Button>
                                        <Button
                                            className="rounded-full "
                                            size="icon"
                                            onClick={(e) =>
                                                setMockStatus("COMPLETED")
                                            }
                                        >
                                            <Icons.check className="size-4" />
                                        </Button>
                                    </div>
                                </Env>
                                <Button
                                    onClick={__cancel}
                                    className="rounded-full "
                                    size="icon"
                                    variant="destructive"
                                >
                                    <Icons.X className="size-4" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="flex-1 grid gap-2 grid-cols-2">
                                    <Field>
                                        <Field.Content>
                                            <Select.Root
                                                {...form.register(
                                                    "paymentMethod",
                                                )}
                                                onValueChange={(e) => {
                                                    form.setValue(
                                                        "paymentMethod",
                                                        e as any,
                                                    );
                                                }}
                                            >
                                                <Select.Trigger>
                                                    <Select.Value placeholder="Payment Method" />
                                                </Select.Trigger>
                                                <Select.Content>
                                                    {salesPaymentMethods.map(
                                                        (s) => (
                                                            <Select.Item
                                                                key={s.value}
                                                                value={s.value}
                                                            >
                                                                {s.label}
                                                            </Select.Item>
                                                        ),
                                                    )}
                                                </Select.Content>
                                            </Select.Root>
                                        </Field.Content>
                                    </Field>
                                    {pm == "check" ? (
                                        <InputGroup>
                                            <InputGroup.Addon align="inline-start">
                                                <InputGroup.Text>
                                                    Check No:
                                                </InputGroup.Text>
                                            </InputGroup.Addon>
                                            <InputGroup.Input
                                                className="!pl-1"
                                                {...form.register("checkNo")}
                                                placeholder="eg., 12345"
                                            />
                                        </InputGroup>
                                    ) : pm == "terminal" ? (
                                        <Field>
                                            <Field.Content>
                                                <Select.Root
                                                    {...form.register(
                                                        "deviceId",
                                                    )}
                                                    onValueChange={(e) => {
                                                        form.setValue(
                                                            "deviceId",
                                                            e,
                                                        );
                                                    }}
                                                >
                                                    <Select.Trigger>
                                                        <Select.Value placeholder="Select Terminal" />
                                                    </Select.Trigger>
                                                    <Select.Content>
                                                        {data?.terminals?.map(
                                                            (
                                                                terminal,
                                                                tIndex,
                                                            ) => (
                                                                <Select.Item
                                                                    disabled={
                                                                        terminal?.status !==
                                                                            "PAIRED" &&
                                                                        terminal?.status !==
                                                                            "AVAILABLE"
                                                                    }
                                                                    key={tIndex}
                                                                    value={
                                                                        terminal?.value
                                                                    }
                                                                >
                                                                    {
                                                                        terminal.label
                                                                    }
                                                                </Select.Item>
                                                            ),
                                                        )}
                                                    </Select.Content>
                                                </Select.Root>
                                            </Field.Content>
                                        </Field>
                                    ) : undefined}
                                </div>
                                {sendLink ? (
                                    <Button
                                        disabled={sendingLink}
                                        className="rounded-full bg-green-500"
                                        size="icon"
                                    >
                                        {sendingLink ? (
                                            <Spinner />
                                        ) : (
                                            <Icons.Email className="size-4" />
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        disabled={
                                            makePayment.isExecuting ||
                                            !!terminalPaymentSession
                                        }
                                        className="rounded-full bg-green-500"
                                        size="icon"
                                    >
                                        {makePayment.isExecuting ||
                                        !!terminalPaymentSession ? (
                                            <Spinner />
                                        ) : (
                                            <Icons.arrowRight className="size-4" />
                                        )}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </form>
        </Form>
    );
}

