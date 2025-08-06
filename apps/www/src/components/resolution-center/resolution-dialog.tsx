"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@gnd/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { Icons } from "@gnd/ui/custom/icons";
import { Textarea } from "@gnd/ui/textarea";
import { GetSalesResolutionData } from "@/actions/get-sales-resolution-data";
import { useAction } from "next-safe-action/hooks";
import { resolvePaymentAction } from "@/actions/resolve-payment-issue";
import { useResolutionCenterParams } from "@/hooks/use-resolution-center-params";
import { generateRandomString } from "@/lib/utils";
import { ResolvePayment, resolvePaymentSchema } from "@api/db/queries/wallet";
import { useZodForm } from "@/hooks/use-zod-form";
import FormSelect from "../common/controls/form-select";
import FormInput from "../common/controls/form-input";
import { cn } from "@gnd/ui/cn";

interface ResolutionDialogProps {
    payment: GetSalesResolutionData["payments"][number];
}

const RESOLUTION_ACTIONS = [
    { value: "cancel", label: "Cancel Payment" },
    { value: "refund", label: "Process Refund" },
];
const REFUND_MODES = [
    { value: "full", label: "Full Refund" },
    { value: "part", label: "Part Refund" },
];
const REFUND_METHOD = [
    { value: "wallet", label: "Wallet" },
    { value: "cash", label: "Cash" },
    { value: "other", label: "Other" },
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
        },
    });

    const watchedAction = form.watch("action");
    const refundMode = form.watch("refundMode");
    const rcp = useResolutionCenterParams();
    const onSubmit = (data: ResolvePayment) => {
        // onResolve(data.action, data.reason, data.note);
        // setOpen(false);
        resolveAction.execute({
            action: data.action,
            note: data.note,
            reason: data.reason,
            customerTransactionId: payment?.id,
        });
    };
    const resolveAction = useAction(resolvePaymentAction, {
        onSuccess() {
            form.reset();
            setOpen(false);
            rcp.setParams({
                refreshToken: generateRandomString(),
            });
        },
    });
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
                <DialogHeader>
                    <DialogTitle>Resolve Payment Issue</DialogTitle>
                    <DialogDescription>
                        Payment ID: {payment.id} | Amount: $
                        {payment.amount.toLocaleString()}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <FormSelect
                            control={form.control}
                            name="action"
                            options={RESOLUTION_ACTIONS}
                            label={"Resolution Action"}
                        />
                        {shouldShowReasonField && (
                            <FormSelect
                                control={form.control}
                                name="reason"
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
                        {watchedAction == "refund" && (
                            <div className="grid grid-cols-2 gap-4">
                                <FormSelect
                                    control={form.control}
                                    name="refundMethod"
                                    rules={{
                                        required: "Please select a method",
                                    }}
                                    label={"Refund Method"}
                                    options={REFUND_METHOD}
                                />
                                <FormSelect
                                    control={form.control}
                                    name="refundMode"
                                    rules={{
                                        required: "Please select a mode",
                                    }}
                                    label={"Refund Mode"}
                                    options={REFUND_MODES}
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
                                            suffix: ` / $${payment?.amount}`,
                                            className: cn(
                                                refundAmount > payment?.amount
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
                                disabled={resolveAction?.isExecuting}
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
                                    resolveAction?.isExecuting
                                }
                            >
                                {form.formState.isSubmitting ||
                                resolveAction?.isExecuting
                                    ? "Applying..."
                                    : "Apply Resolution"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
