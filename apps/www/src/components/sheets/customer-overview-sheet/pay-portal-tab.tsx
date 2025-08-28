import { env } from "process";
import { Env } from "@/components/env";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { DataSkeleton } from "@/components/data-skeleton";
import { EmptyState } from "@/components/empty-state";
import { SubmitButton } from "@/components/submit-button";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { formatMoney } from "@/lib/use-number";
import { cn } from "@/lib/utils";
import { salesPaymentMethods } from "@/utils/constants";
import { CheckCircle, Dot, Wallet } from "lucide-react";

import { Button } from "@gnd/ui/button";
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
import { usePayPortal } from "./pay-portal-context";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@gnd/ui/use-toast";
import { useDebugConsole } from "@/hooks/use-debug-console";

export function PayPortalTab({}) {
    const {
        data,
        skel,
        selections,
        query,
        terminalPaymentSession,
        setMockStatus,
        form,
        makePayment,
        pm,
        toast: loadingToast,
    } = usePayPortal();
    const trpc = useTRPC();
    const payWithWallet = useMutation(
        trpc.sales.salesPayWithWallet.mutationOptions({
            onSuccess(data, variables, context) {
                toast({
                    title: "Payment Applied",
                });
            },
        }),
    );
    useDebugConsole({ data });
    const auth = useAuth();
    const walletPay = async () => {
        payWithWallet.mutate({
            salesIds: selections,
            // walletId: data.wallet.id,
            accountNo: data.wallet.accountNo,
            authorId: auth.id,
        });
    };
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
                                            ? "bg-muted hover:bg-muted"
                                            : "hover:bg-muted",
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
                    <Env isDev>
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
                    </Env>
                )}
                <CustomSheetContentPortal>
                    <SheetFooter className="-m-4 -mb-2 border-t p-4 shadow-xl">
                        <div className="flex flex-col w-full">
                            <div className="flex items-center justify-between p-3 bg-secondary-foreground text-secondary rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Wallet className="h-4 w-4" />
                                    <span className="font-medium">
                                        Current Wallet Balance
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-green-600">
                                        ${data?.walletBalance?.toFixed(2)}
                                    </span>
                                    <Button
                                        disabled={!data?.walletBalance}
                                        className="h-6 px-3"
                                        size="xs"
                                        variant="outline"
                                        onClick={walletPay}
                                    >
                                        Pay
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Form {...form}>
                                    <form
                                        onSubmit={form.handleSubmit((e) => {
                                            // pToast.updateNotification("loading");
                                            loadingToast.start();
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
                                                form.setValue(
                                                    "deviceName",
                                                    e.label,
                                                );
                                            }}
                                            name="deviceId"
                                            disabled={pm != "terminal"}
                                            SelectItem={({ option }) => (
                                                <SelectItem
                                                    value={option.value}
                                                    disabled={
                                                        env.NEXT_PUBLIC_NODE_ENV ==
                                                        "production"
                                                            ? option.status !=
                                                              "PAIRED"
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
                                                        <span>
                                                            {option.label}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            )}
                                            label="Terminal"
                                        />
                                        <div className="col-span-2 flex justify-end">
                                            <Env isDev>
                                                <Button
                                                    type="button"
                                                    onClick={(e) => {
                                                        form.trigger().then(
                                                            (e) => {
                                                                console.log(
                                                                    form
                                                                        .formState
                                                                        .errors,
                                                                );
                                                            },
                                                        );
                                                    }}
                                                >
                                                    AAA
                                                </Button>
                                            </Env>
                                            <SubmitButton
                                                isSubmitting={
                                                    makePayment.isExecuting ||
                                                    !!terminalPaymentSession
                                                }
                                                disabled={
                                                    makePayment.isExecuting ||
                                                    !form.formState.isValid ||
                                                    !!terminalPaymentSession
                                                }
                                            >
                                                Pay
                                            </SubmitButton>
                                        </div>
                                    </form>
                                </Form>
                            </div>
                        </div>
                    </SheetFooter>
                </CustomSheetContentPortal>
            </DataSkeletonProvider>
        </EmptyState>
    );
}
