import { env } from "process";
import { useEffect, useState } from "react";
import DevOnly from "@/_v2/components/common/dev-only";
import { cancelTerminaPaymentAction } from "@/actions/cancel-terminal-payment-action";
import { createSalesPaymentAction } from "@/actions/create-sales-payment";
import { getCustomerPayPortalAction } from "@/actions/get-customer-pay-portal-action";
import { getTerminalPaymentStatusAction } from "@/actions/get-terminal-payment-status";
import { createPaymentSchema } from "@/actions/schema";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { revalidateTable } from "@/components/(clean-code)/data-table/use-infinity-data-table";
import Button from "@/components/common/button";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { DataSkeleton } from "@/components/data-skeleton";
import { EmptyState } from "@/components/empty-state";
import { SubmitButton } from "@/components/submit-button";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import {
    DataSkeletonProvider,
    useCreateDataSkeletonCtx,
} from "@/hooks/use-data-skeleton";
import { staticPaymentData, usePaymentToast } from "@/hooks/use-payment-toast";
import { formatMoney } from "@/lib/use-number";
import { cn, generateRandomString, sum } from "@/lib/utils";
import { TerminalCheckoutStatus } from "@/modules/square";
import { salesPaymentMethods } from "@/utils/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Dot } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Form } from "@gnd/ui/form";
import { SelectItem } from "@gnd/ui/select";
import { SheetFooter } from "@gnd/ui/sheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { CustomSheetContentPortal } from "../custom-sheet-content";

export function PayPortalTab({}) {
    const query = useCustomerOverviewQuery();

    const loader = async () =>
        await getCustomerPayPortalAction(query.accountNo);
    const skel = useCreateDataSkeletonCtx({
        loader,
        autoLoad: true,
    });
    const data = skel?.data;
    const selections = query.params?.["pay-selections"];
    useEffect(() => {
        const amountDue = sum(
            data?.pendingSales?.filter((a) => selections?.includes(a.id)),
            "amountDue",
        );
        form.setValue("amount", formatMoney(amountDue));
    }, [selections, data]);
    const form = useForm<z.infer<typeof createPaymentSchema>>({
        resolver: zodResolver(createPaymentSchema),
        defaultValues: {
            // terminal: null as CreateTerminalPaymentAction["resp"],
            paymentMethod: undefined,
            accountNo: query?.params?.accountNo,
            salesIds: query?.params?.["pay-selections"],
            amount: undefined,
            // squarePaymentId: undefined,
            // paymentMethod: tx.paymentMethod,
            // amount: tx.totalPay,
            checkNo: undefined,
            deviceId: undefined,
            enableTip: undefined,
            terminalPaymentSession: undefined,
        },
    });

    const [waitSeconds, setWaitSeconds] = useState(null);
    const [waitTok, setWaitTok] = useState(null);
    useEffect(() => {
        if (waitTok) {
            setWaitTok(null);
            setWaitSeconds((waitSeconds || 0) + 1);
            checkTerminalStatus();
        }
    }, [waitTok, waitSeconds]);
    const pToast = usePaymentToast();
    async function terminalPaymentSuccessful() {
        makePayment.execute({
            ...form.getValues(),
            // squarePaymentId,
        });
    }
    useEffect(() => {
        const selections = query.params?.["pay-selections"];
        form.setValue("salesIds", selections);
        form.setValue(
            "orderNos",
            data?.pendingSales
                ?.filter((a) => selections?.includes(a.id))
                .map((a) => a.orderId),
        );
    }, [query.params?.["pay-selections"], data?.pendingSales]);
    const pm = form.watch("paymentMethod");
    const terminalPaymentSession = form.watch("terminalPaymentSession");

    const makePayment = useAction(createSalesPaymentAction, {
        onSuccess: (args) => {
            if (args.data?.terminalPaymentSession) {
                pToast.updateNotification("terminal-waiting");
                setWaitSeconds(0);
                form.setValue(
                    "terminalPaymentSession",
                    args.data.terminalPaymentSession,
                );
            } else {
                if (args.data.status) {
                    pToast.updateNotification("payment-success");
                    revalidateTable();
                }
            }
        },
        onError(error) {
            console.log(error);

            staticPaymentData.description = error.error?.serverError;
            pToast.updateNotification("failed");
        },
    });
    const cancelTerminalPayment = useAction(cancelTerminaPaymentAction, {
        onSuccess: (args) => {
            setWaitSeconds(null);
            form.setValue("terminalPaymentSession", null);
            pToast.updateNotification("terminal-cancelled");
        },
    });
    function terminalManualAcceptPayment(e) {
        pToast.updateNotification("terminal-waiting");
        setWaitSeconds(0);
        setWaitTok(generateRandomString());
    }
    staticPaymentData.accept = terminalManualAcceptPayment;
    useEffect(() => {
        if (terminalPaymentSession) checkTerminalStatus();
    }, [terminalPaymentSession]);
    function checkTerminalStatus() {
        setTimeout(
            () => {
                if (waitSeconds > 15) {
                    pToast.updateNotification("terminal-long-waiting");
                } else pToast.updateNotification("terminal-waiting");
                if (waitSeconds > 17) {
                    setWaitTok(null);
                    return;
                }
                if (mockStatus) processTerminalPaymentStatus(mockStatus);
                checkTerminalPaymentStatus.execute({
                    checkoutId: terminalPaymentSession.squareCheckoutId,
                    squarePaymentId: terminalPaymentSession.squarePaymentId,
                });
            },
            waitSeconds > 5 ? 2000 : waitSeconds > 10 ? 3000 : 1500,
        );
    }
    const [mockStatus, setMockStatus] = useState<TerminalCheckoutStatus>(null);
    function processTerminalPaymentStatus(status: TerminalCheckoutStatus) {
        if (status == "COMPLETED") {
            setWaitSeconds(null);
            setWaitTok(null);
        }
        switch (status) {
            case "COMPLETED":
                // form.setValue("terminal.tip", response.tip);
                form.setValue("terminalPaymentSession.status", "COMPLETED");
                terminalPaymentSuccessful();
                break;
            case "CANCELED":
            case "CANCEL_REQUESTED":
                form.setValue("terminalPaymentSession.status", "CANCELED");
                cancelTerminalPayment.execute({
                    checkoutId: terminalPaymentSession.squareCheckoutId,
                });
                pToast.updateNotification("terminal-cancelled");
                break;
            default:
                setWaitTok(generateRandomString());
                // setWaitSeconds((waitSeconds || 0) + 1);
                // checkTerminalStatus();
                break;
        }
    }
    const checkTerminalPaymentStatus = useAction(
        getTerminalPaymentStatusAction,
        {
            onSuccess: (args) => {
                processTerminalPaymentStatus(args.data.status);
            },
            onError(args) {
                console.log(args);
                pToast.updateNotification("terminal-cancelled");
            },
        },
    );
    return (
        <EmptyState
            empty={data?.totalPayable == 0}
            title="No pending payments"
            description="No pending payments found for this customer."
        >
            <DataSkeletonProvider value={skel}>
                <Table className="table-sm">
                    <TableHeader>
                        <TableRow>
                            <TableHead></TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Order #</TableHead>
                            <TableHead className="text-end">Total</TableHead>
                            <TableHead className="text-end">Pending</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {skel
                            .renderList(data?.pendingSales, 5, {
                                createdAt: new Date(),
                                amountDue: 500,
                                grandTotal: 1000,
                                id: 2,
                                orderId: "",
                            })
                            ?.map((sale, i) => (
                                <TableRow
                                    key={i}
                                    className={cn(
                                        "cursor-pointer",
                                        selections?.includes(sale?.id)
                                            ? "bg-muted hover:bg-muted/30"
                                            : "hover:bg-muted/25",
                                    )}
                                    onClick={(e) => {
                                        let sels = [...(selections || [])];
                                        const index = sels.indexOf(sale.id);
                                        if (index >= 0) sels.splice(index, 1);
                                        else sels.push(sale.id);

                                        query.setParams({
                                            "pay-selections": sels,
                                        });
                                    }}
                                >
                                    <TableCell className="w-10">
                                        <CheckCircle
                                            className={cn(
                                                "size-4",
                                                selections?.includes(sale?.id)
                                                    ? "text-green-700"
                                                    : "opacity-20",
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <DataSkeleton pok="date">
                                            <TCell.Date>
                                                {sale.createdAt}
                                            </TCell.Date>
                                        </DataSkeleton>
                                    </TableCell>
                                    <TableCell className="font-mono">
                                        <DataSkeleton pok="orderId">
                                            <TCell.Primary>
                                                {sale.orderId}
                                            </TCell.Primary>
                                        </DataSkeleton>
                                    </TableCell>
                                    <TableCell
                                        className="font-mono"
                                        align="right"
                                    >
                                        $
                                        <DataSkeleton
                                            as="span"
                                            pok="moneyLarge"
                                        >
                                            {formatMoney(sale?.grandTotal)}
                                        </DataSkeleton>
                                    </TableCell>
                                    <TableCell
                                        className="font-mono"
                                        align="right"
                                    >
                                        $
                                        <DataSkeleton
                                            as="span"
                                            pok="moneyLarge"
                                        >
                                            {formatMoney(sale?.amountDue)}
                                        </DataSkeleton>
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
                {!terminalPaymentSession || (
                    <DevOnly>
                        <div className="flex gap-4">
                            <Button
                                onClick={(e) => setMockStatus("CANCELED")}
                                variant="destructive"
                            >
                                Failed
                            </Button>
                            <Button onClick={(e) => setMockStatus("COMPLETED")}>
                                Success
                            </Button>
                        </div>
                    </DevOnly>
                )}
                <CustomSheetContentPortal>
                    <SheetFooter className="-m-4 -mb-2 border-t p-4 shadow-xl">
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit((e) => {
                                    pToast.updateNotification("loading");

                                    makePayment.execute(e);
                                })}
                                className="grid w-full grid-cols-2 gap-2"
                            >
                                <FormSelect
                                    size="sm"
                                    control={form.control}
                                    name="paymentMethod"
                                    options={salesPaymentMethods}
                                    titleKey="label"
                                    valueKey="value"
                                    label="Payment Method"
                                />
                                <FormInput
                                    control={form.control}
                                    name="amount"
                                    type="number"
                                    size="sm"
                                    label={"Amounts"}
                                    prefix="$"
                                    // disabled
                                    // disabled={tx.inProgress}
                                />
                                <FormInput
                                    control={form.control}
                                    name="checkNo"
                                    size="sm"
                                    label={"Check No."}
                                    disabled={pm != "check"}
                                    // disabled={tx.inProgress}
                                />
                                <FormSelect
                                    options={data?.terminals || []}
                                    control={form.control}
                                    size="sm"
                                    onSelect={(e) => {
                                        form.setValue("deviceName", e.label);
                                    }}
                                    name="deviceId"
                                    disabled={pm != "terminal"}
                                    SelectItem={({ option }) => (
                                        <SelectItem
                                            value={option.value}
                                            disabled={
                                                env.NEXT_PUBLIC_NODE_ENV ==
                                                "production"
                                                    ? option.status != "PAIRED"
                                                    : false
                                            }
                                            className=""
                                        >
                                            <div className="flex items-center gap-2">
                                                <Dot
                                                    className={cn(
                                                        option.status ==
                                                            "PAIRED"
                                                            ? "text-green-500"
                                                            : "text-red-600",
                                                    )}
                                                />
                                                <span>{option.label}</span>
                                            </div>
                                        </SelectItem>
                                    )}
                                    label="Terminal"
                                />
                                <div className="col-span-2 flex justify-end">
                                    <SubmitButton
                                        isSubmitting={
                                            makePayment.isExecuting ||
                                            !pToast.idle
                                        }
                                        disabled={
                                            makePayment.isExecuting ||
                                            !form.formState.isValid
                                        }
                                    >
                                        Pay
                                    </SubmitButton>
                                </div>
                            </form>
                        </Form>
                    </SheetFooter>
                </CustomSheetContentPortal>
            </DataSkeletonProvider>
        </EmptyState>
    );
}
