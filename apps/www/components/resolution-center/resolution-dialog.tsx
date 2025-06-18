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
} from "@/components/ui/select";
import { Icons } from "@gnd/ui/custom/icons";
import { Textarea } from "@gnd/ui/textarea";
import { GetSalesResolutionData } from "@/actions/get-sales-resolution-data";
import { useAction } from "next-safe-action/hooks";
import { resolvePaymentAction } from "@/actions/resolve-payment-issue";

interface ResolutionFormData {
    action: string;
    reason?: string;
    note?: string;
}

interface ResolutionDialogProps {
    payment: GetSalesResolutionData["payments"][number];
}

const RESOLUTION_ACTIONS = [
    { value: "cancel", label: "Cancel Payment" },
    { value: "refund", label: "Process Refund" },
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
    { value: "dispute", label: "Dispute Resolution" },
];

export function ResolutionDialog({
    payment,
    // onResolve,
}: ResolutionDialogProps) {
    const [open, setOpen] = useState(false);

    const form = useForm<ResolutionFormData>({
        defaultValues: {
            action: "",
            reason: "",
            note: "",
        },
    });

    const watchedAction = form.watch("action");

    const onSubmit = (data: ResolutionFormData) => {
        // onResolve(data.action, data.reason, data.note);
        setOpen(false);
        form.reset();
    };
    const resolveAction = useAction(resolvePaymentAction, {
        onSuccess() {},
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

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    disabled={
                        payment?.status?.toLocaleLowerCase() == "canceled"
                    }
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
                        <FormField
                            control={form.control}
                            name="action"
                            rules={{
                                required: "Please select a resolution action",
                            }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Resolution Action</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select action" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {RESOLUTION_ACTIONS.map(
                                                (action) => (
                                                    <SelectItem
                                                        key={action.value}
                                                        value={action.value}
                                                    >
                                                        {action.label}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {shouldShowReasonField && (
                            <FormField
                                control={form.control}
                                name="reason"
                                rules={{
                                    required: shouldShowReasonField
                                        ? "Please select a reason"
                                        : false,
                                }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {watchedAction === "cancel"
                                                ? "Cancellation Reason"
                                                : "Refund Reason"}
                                        </FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select reason" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {reasonOptions.map((reason) => (
                                                    <SelectItem
                                                        key={reason.value}
                                                        value={reason.value}
                                                    >
                                                        {reason.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Additional Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter any additional notes..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
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
                                    form.formState.isSubmitting
                                }
                            >
                                {form.formState.isSubmitting
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
