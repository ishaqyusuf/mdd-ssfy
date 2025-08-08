"use client";

import { useMemo, useState } from "react";
import { Button } from "@gnd/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@gnd/ui/dialog";
import { Form } from "@gnd/ui/form";

import { Icons } from "@gnd/ui/custom/icons";
import { GetSalesResolutionData } from "@/actions/get-sales-resolution-data";
import { useResolutionCenterParams } from "@/hooks/use-resolution-center-params";
import { ResolvePayment, resolvePaymentSchema } from "@api/db/queries/wallet";
import { useZodForm } from "@/hooks/use-zod-form";
import FormSelect from "../common/controls/form-select";
import FormInput from "../common/controls/form-input";
import { cn } from "@gnd/ui/cn";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "@gnd/ui/use-toast";
import { SALES_REFUND_METHODS_OPTIONS } from "@sales/constants";

interface ResolutionDialogProps {
    payment: GetSalesResolutionData["payments"][number];
    refundableAmount?;
}

const RESOLUTION_ACTIONS = [
    { value: "cancel", label: "Cancel Payment" },
    { value: "refund", label: "Process Refund" },
];
const REFUND_MODES = [
    { value: "full", label: "Full Refund" },
    { value: "part", label: "Part Refund" },
];

const CANCELLATION_REASONS = [
    { value: "refund-wallet", label: "Refund to Wallet" },
    { value: "duplicate", label: "Duplicate Payment" },
    { value: "customer-repay", label: "Customer Will Repay" },
    { value: "no-reason", label: "No Specific Reason" },
    { value: "fraud", label: "Fraudulent Transaction" },
    { value: "error", label: "Processing Error" },
];

const REFUND_REASONS = [
    { value: "overpayment", label: "Overpayment" },
    { value: "customer-request", label: "Customer Request" },
    { value: "order-cancelled", label: "Order Cancelled" },
    { value: "duplicate", label: "Duplicate Charge" },
    // { value: "dispute", label: "Dispute Resolution" },
];

export function ResolutionDialog({
    payment,
    refundableAmount,
    // onResolve,
}: ResolutionDialogProps) {
    const [open, setOpen] = useState(false);

    const form = useZodForm(resolvePaymentSchema, {
        defaultValues: {
            action: "cancel",
            transactionId: payment.id,
            reason: "",
            note: "",
            refundMethod: "wallet",
            refundMode: "full",
            refundAmount: payment?.amount,
            squarePaymentId: payment?.squarePaymentId,
        },
    });

    const watchedAction = form.watch("action");
    const refundMode = form.watch("refundMode");
    const rcp = useResolutionCenterParams();
    const trpc = useTRPC();
    const qc = useQueryClient();
    const resolveAction = useMutation(
        trpc.sales.resolvePayment.mutationOptions({
            onSuccess(data, variables, context) {
                toast({
                    title: "Success",
                    variant: "success",
                });
                setOpen(false);
                qc.invalidateQueries({
                    queryKey: trpc.sales.getSalesResolutions.queryKey(),
                });
            },
            onError(error, variables, context) {
                toast({
                    title: "Error",
                    variant: "error",
                    description: error.message,
                });
            },
        }),
    );
    const onSubmit = (data: ResolvePayment) => {
        resolveAction.mutate({
            ...data,
            paymentMethod: payment.paymentMethod,
        });
    };
    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            form.reset();
        }
    };

    const getReasonsForAction = (action: string) => {
        switch (action) {
            case "cancel":
                return CANCELLATION_REASONS;
            case "refund":
                return REFUND_REASONS;
            default:
                return [];
        }
    };

    const shouldShowReasonField =
        watchedAction === "cancel" || watchedAction === "refund";
    const reasonOptions = getReasonsForAction(watchedAction);
    const refundAmount = form.watch("refundAmount");
    const refundMethods = useMemo(
        () =>
            SALES_REFUND_METHODS_OPTIONS.map((rm) => {
                // if (
                //     !payment?.squarePaymentId &&
                //     matchValue(rm.value).in("credit-card", "terminal")
                // )
                //     (rm as any).disabled = true;
                // console.log(
                //     rm.value,
                //     payment?.squarePaymentId,
                //     !payment?.squarePaymentId &&
                //         matchValue(rm.value).in("credit-card", "terminal"),
                // );
                return rm;
            }),
        [payment],
    );

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    // disabled={
                    //     payment?.status?.toLocaleLowerCase() == "canceled"
                    // }
                    variant="outline"
                    size="sm"
                >
                    <Icons.more className="h-4 w-4" />
                    Resolve
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                {!open || (
                    <>
                        <DialogHeader>
                            <DialogTitle>Resolve Payment Issue</DialogTitle>
                            <DialogDescription>
                                Payment ID: {payment.id} | Amount: $
                                {payment.amount.toLocaleString()}
                                {` | ${payment.squarePaymentId}`}
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <FormSelect
                                        control={form.control}
                                        name="action"
                                        size="sm"
                                        options={RESOLUTION_ACTIONS}
                                        label={"Resolution Action"}
                                    />
                                    {shouldShowReasonField && (
                                        <FormSelect
                                            control={form.control}
                                            name="reason"
                                            size="sm"
                                            rules={{
                                                required: shouldShowReasonField
                                                    ? "Please select a reason"
                                                    : false,
                                            }}
                                            label={
                                                watchedAction === "cancel"
                                                    ? "Cancellation Reason"
                                                    : "Refund Reason"
                                            }
                                            options={reasonOptions}
                                        />
                                    )}
                                </div>
                                {watchedAction == "refund" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormSelect
                                            control={form.control}
                                            name="refundMethod"
                                            rules={{
                                                required:
                                                    "Please select a method",
                                            }}
                                            label={"Refund Method"}
                                            options={refundMethods}
                                        />
                                        <FormSelect
                                            control={form.control}
                                            name="refundMode"
                                            rules={{
                                                required:
                                                    "Please select a mode",
                                            }}
                                            label={"Refund Mode"}
                                            options={REFUND_MODES}
                                            onSelect={(e) => {
                                                if (
                                                    (e as any) == "part" &&
                                                    refundableAmount
                                                ) {
                                                    console.log(e);
                                                    form.setValue(
                                                        "refundAmount",
                                                        refundableAmount,
                                                    );
                                                }
                                            }}
                                        />
                                        <div className="col-span-2">
                                            <FormInput
                                                control={form.control}
                                                name="refundAmount"
                                                label="Refund Amount"
                                                disabled={refundMode === "full"}
                                                numericProps={{
                                                    prefix: `$`,
                                                    type: "tel",
                                                    max: payment?.amount,
                                                    min: 0,
                                                    placeholder: `$0 / $${payment?.amount}`,
                                                    disabled:
                                                        refundMode == "full",
                                                    suffix: ` / $${payment?.amount}`,
                                                    className: cn(
                                                        refundAmount >
                                                            payment?.amount
                                                            ? "text-red-800"
                                                            : "",
                                                    ),
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                                <FormInput
                                    control={form.control}
                                    type="textarea"
                                    name="note"
                                    label="Additional Notes"
                                    placeholder="Enter any additional notes..."
                                />

                                <DialogFooter>
                                    <Button
                                        disabled={resolveAction?.isPending}
                                        type="button"
                                        variant="outline"
                                        onClick={() => setOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            !form.formState.isValid ||
                                            form.formState.isSubmitting ||
                                            resolveAction?.isPending
                                        }
                                    >
                                        {form.formState.isSubmitting ||
                                        resolveAction?.isPending
                                            ? "Applying..."
                                            : "Apply Resolution"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
