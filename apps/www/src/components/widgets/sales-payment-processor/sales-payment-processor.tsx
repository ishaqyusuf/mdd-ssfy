import { cancelTerminaPaymentAction } from "@/actions/cancel-terminal-payment-action";
import { createSalesPaymentAction } from "@/actions/create-sales-payment";
import { createPaymentSchema } from "@/actions/schema";
import { _trpc } from "@/components/static-trpc";
import { useZodForm } from "@/hooks/use-zod-form";
import { paymentMethods, salesPaymentMethods } from "@/utils/constants";
import { formatDate } from "@/utils/format";
import { Button, ButtonProps } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import {
    AlertDialog,
    Dialog,
    Field,
    InputGroup,
    Item,
    Popover,
    Select,
} from "@gnd/ui/composite";
import { Icons } from "@gnd/ui/custom/icons";
import { Menu } from "@gnd/ui/custom/menu";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Form } from "@gnd/ui/form";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Separator } from "@gnd/ui/separator";
import { Spinner } from "@gnd/ui/spinner";
import { sum } from "@gnd/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import React, {
    startTransition,
    Suspense,
    useEffect,
    useState,
    useTransition,
} from "react";
import { useFieldArray } from "react-hook-form";
import z from "zod";

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
                        className="w-full"
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
                    <Content {...props} />
                </Suspense>
            </Dialog.Content>
        </Dialog.Root>
    );
}

function Content(props: Props) {
    const accountNo = props.phoneNo ?? `cust-${props.customerId}`;
    const { data, error, isPending } = useSuspenseQuery(
        _trpc.customers.getCustomerPayPortal.queryOptions({
            accountNo,
        })
    );
    const form = useZodForm(
        createPaymentSchema.merge(
            z.object({
                editPrice: z.boolean().default(false),
                sales: z.array(
                    z.object({
                        id: z.number(),
                        selected: z.boolean(),
                    })
                ),
            })
        ),
        {
            defaultValues: {},
        }
    );
    useEffect(() => {
        form.reset({
            deviceId: data?.lastTerminalId,
            terminalPaymentSession: null,
            sales: data.pendingSales.map((s) => ({
                id: s.id,
                selected: props.selectedIds.includes(s.id),
            })),
        });
    }, [data]);
    const {
        sales: wSales,
        paymentMethod: pm,
        amount,
        editPrice,
        terminalPaymentSession,
    } = form.watch();
    useEffect(() => {
        if (!wSales) return;
        form.setValue(
            "amount",
            sum(
                // wSales.filter(a => a.selected),
                data?.pendingSales?.filter(
                    (a) => wSales?.find((b) => b.id == a.id)?.selected
                ),
                "amountDue"
            )
        );
    }, [wSales]);
    const makePayment = useAction(createSalesPaymentAction, {
        onSuccess: (args) => {
            if (args.data?.terminalPaymentSession) {
                form.setValue(
                    "terminalPaymentSession",
                    args.data.terminalPaymentSession
                );
                setTimeout(() => {
                    setWaitSeconds(0);
                }, 2000);
            } else {
                if (args.data.status) {
                    form.setValue("terminalPaymentSession", null);

                    // sq.invalidate.salesList();
                    // query.setParams({
                    //     "pay-selections": null,
                    //     tab: "transactions",
                    // });
                    setTimeout(() => {
                        // if (salesQ?.params?.["sales-overview-id"]) {
                        //     salesQ.salesQuery.salesPaymentUpdated();
                        //     query?.setParams(null);
                        // }
                        // printSalesData({
                        //     mode: "order-packing",
                        //     slugs: args.input.orderNos?.join(","),
                        // });
                    }, 1000);
                }
            }
        },
        onError(error) {
            // staticPaymentData.description = error.error?.serverError;
        },
    });
    const [waitSeconds, setWaitSeconds] = useState(null);
    const cancelTerminalPayment = useAction(cancelTerminaPaymentAction, {
        onSuccess: (args) => {
            setWaitSeconds(null);
            form.setValue("terminalPaymentSession", null);
        },
        onError(e) {
            //toast.error("Unable to cancel payment");
        },
    });

    const initPayment = async () => {};
    const percentageList = [25, 50, 75, 100];

    const disabled = false;
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
            <div className="grid gap-4">
                <ScrollArea className="max-h-[45vh]">
                    <Item.Group className="grid grid-cols-2s gap-2">
                        {data?.pendingSales?.map((sale, index) => (
                            <React.Fragment key={sale?.id}>
                                <Item
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                        form.setValue(
                                            `sales.${index}.selected`,
                                            !wSales?.[index]?.selected
                                        );
                                    }}
                                    className={cn(
                                        !wSales?.[index]?.selected ||
                                            "bg-green-100 border-green-500",
                                        "cursor-pointer p-2"
                                    )}
                                >
                                    <Item.Content className="flex-row justify-between">
                                        <Item.Title
                                            className={cn(
                                                "text-accents inline-flex"
                                            )}
                                        >
                                            {sale?.orderId}
                                        </Item.Title>
                                        <Item.Description
                                            className={cn(
                                                "text-secondary-foregrounds flex gap-2 items-center"
                                            )}
                                        >
                                            <span>
                                                {formatDate(sale?.createdAt)}
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
                <div className="flex justify-end gap-2 items-center">
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
                                <InputGroup.Addon align="end">
                                    <InputGroup.Text>
                                        / ${amount}
                                    </InputGroup.Text>
                                </InputGroup.Addon>
                            </InputGroup>
                        </>
                    ) : (
                        <>
                            <span className="font-bold">Total: ${amount}</span>
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
                <div className="flex items-center gap-2">
                    <div className="flex-1 grid gap-2 grid-cols-2">
                        <Field>
                            <Field.Content>
                                <Select.Root
                                    {...form.register("paymentMethod")}
                                    onValueChange={(e) => {
                                        form.setValue(
                                            "paymentMethod",
                                            e as any
                                        );
                                    }}
                                >
                                    <Select.Trigger>
                                        <Select.Value placeholder="Payment Method" />
                                    </Select.Trigger>
                                    <Select.Content>
                                        {salesPaymentMethods.map((s) => (
                                            <Select.Item
                                                key={s.value}
                                                value={s.value}
                                            >
                                                {s.label}
                                            </Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                            </Field.Content>
                        </Field>
                        {pm == "check" ? (
                            <InputGroup>
                                <InputGroup.Addon align="inline-start">
                                    <InputGroup.Text>Check No:</InputGroup.Text>
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
                                        {...form.register("deviceId")}
                                        onValueChange={(e) => {
                                            form.setValue("deviceId", e);
                                        }}
                                    >
                                        <Select.Trigger>
                                            <Select.Value placeholder="Select Terminal" />
                                        </Select.Trigger>
                                        <Select.Content>
                                            {data?.terminals?.map(
                                                (terminal, tIndex) => (
                                                    <Select.Item
                                                        disabled={
                                                            terminal?.status !==
                                                            "PAIRED"
                                                        }
                                                        key={tIndex}
                                                        value={terminal?.value}
                                                    >
                                                        {terminal.label}
                                                    </Select.Item>
                                                )
                                            )}
                                        </Select.Content>
                                    </Select.Root>
                                </Field.Content>
                            </Field>
                        ) : undefined}
                    </div>
                    <Button
                        disabled={
                            makePayment.isExecuting ||
                            !form.formState.isValid ||
                            !!terminalPaymentSession
                        }
                        className="rounded-full bg-green-500"
                        size="icon"
                    >
                        {makePayment.isExecuting || !!terminalPaymentSession ? (
                            <Spinner />
                        ) : (
                            <Icons.arrowRight className="size-4" />
                        )}
                    </Button>
                </div>
            </div>
        </Form>
    );
}

