"use client";

import { useTransition } from "react";
import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import {
    applyPaymentAction,
    deleteSalesPayment,
} from "@/app/(v1)/(loggedIn)/sales/_actions/sales-payment";
import Btn from "@/components/_v1/btn";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import { Info } from "@/components/_v1/info";
import Money from "@/components/_v1/money";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { TableCol } from "@/components/common/data-table/table-cells";
import Modal from "@/components/common/modal";
import { useModal } from "@/components/common/modal/provider";
import useStaticDataLoader from "@/lib/static-data-loader";
import useEffectLoader from "@/lib/use-effect-loader";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import SquarePaymentModal from "../_square-payment-modal";
import salesData from "../../../sales/sales-data";
import { getSalesPayments } from "./_actions/get-payments";

interface Props {
    id;
    orderId;
    edit?: boolean;
    form?;
}
export default function PaymentModal({
    id,
    orderId,
    edit,
    form: salesForm,
}: Props) {
    const modal = useModal();
    const ctx = useEffectLoader(async () => await getSalesPayments(id), {});
    const form = useForm({
        defaultValues: {
            showForm: false,
            data: {
                paymentOption: "",
                amount: 0,
                checkNo: "",
            },
        },
    });
    const [loading, startTransition] = useTransition();
    async function pay() {
        startTransition(async () => {
            const formData = form.getValues().data;
            const order = ctx.data;
            // console.log(order);
            // return;
            if (!order) return;
            const amountPaid = Number(formData.amount);
            const amountDue = (order.amountDue || 0) - amountPaid;
            let totalPaid = order.grandTotal - amountDue;
            await applyPaymentAction({
                orders: [
                    {
                        orderId: order.orderId,
                        checkNo: formData.checkNo,
                        salesRepId: order.salesRepId,
                        id: order.id,
                        paymentOption: formData.paymentOption,
                        amountPaid,
                        amountDue,
                        customerId: order.customerId,
                        grandTotal: order.grandTotal,
                    },
                ],
                credit: amountPaid,
                debit: amountDue,
            });
            toast.message("Payment Applied");
            form.reset({
                showForm: false,
                data: {},
            });
            ctx.refresh();
            await _revalidate("salesOverview");
            await _revalidate("salesOverview1");
            if (salesForm) salesForm.setValue("paidAmount", totalPaid);
            console.log(totalPaid);
        });
    }
    async function deletePayment(payment) {
        const amountDue = (ctx?.data?.amountDue || 0) + payment.amount;
        await deleteSalesPayment({
            id: payment.id,
            orderId: ctx?.data?.id,
            amountDue,
            amount: payment.amount,
            refund: false,
            // refund: true,
        });
        toast.success("Deleted!");
        ctx.refresh();
    }
    const showForm = form.watch("showForm");
    return (
        <Modal.Content>
            <Modal.Header title="Payments" subtitle={orderId} />
            <div className="-px-8 h-[90vh] overflow-auto">
                <div className="flex gap-4 py-4">
                    <Info
                        label="Invoice"
                        value={<Money value={ctx.data?.grandTotal} />}
                    />
                    <Info
                        label="Pending"
                        value={<Money value={ctx.data?.amountDue} />}
                    />
                    <Info
                        label="Payment Term"
                        value={ctx.data?.paymentTerm || "-"}
                    />
                    <Info
                        label="Invoice Due Date"
                        value={
                            ctx.data?.paymentDueDate ? (
                                <TableCol.Date>
                                    {ctx.data?.paymentDueDate}
                                </TableCol.Date>
                            ) : (
                                "-"
                            )
                        }
                    />
                </div>
                {ctx.data?.payments?.length ? (
                    <Table>
                        <TableHeader>
                            <TableHead>Payment Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead></TableHead>
                        </TableHeader>
                        <TableBody>
                            {ctx.data?.payments?.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell>
                                        <TableCol.Date>
                                            {payment.createdAt}
                                        </TableCol.Date>
                                    </TableCell>
                                    <TableCell>
                                        <TableCol.Money
                                            value={payment.amount}
                                        />
                                        <TableCol.Secondary>
                                            {payment.meta.paymentOption}
                                        </TableCol.Secondary>
                                    </TableCell>
                                    <TableCell>
                                        <ConfirmBtn
                                            onClick={() =>
                                                deletePayment(payment)
                                            }
                                            trash
                                            size={"icon"}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="flex h-[20vh] flex-col items-center justify-center gap-4 text-muted-foreground">
                        <Icons.dollar />
                        <p className="">No Payment Applied yet</p>
                    </div>
                )}
                <div className="grid gap-2">
                    <Button
                        className={cn("w-full", showForm && "hidden")}
                        size="sm"
                        onClick={() => {
                            modal.openModal(
                                <SquarePaymentModal id={ctx.data.id} />,
                            );
                        }}
                    >
                        Square Checkout
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            form.setValue("showForm", true);
                            form.setValue("data.amount", ctx.data?.amountDue);
                        }}
                        className={cn("w-full", showForm && "hidden")}
                        disabled={!ctx?.data?.amountDue}
                        size={"sm"}
                    >
                        Apply Payment
                    </Button>
                </div>
                {showForm && (
                    <Form {...form}>
                        <div className="mb-10 grid grid-cols-2 gap-4 rounded border p-2">
                            <FormSelect
                                className="col-span-2"
                                size="sm"
                                label={"Payment Option"}
                                options={salesData.paymentOptions}
                                control={form.control}
                                name="data.paymentOption"
                            />
                            <FormInput
                                className=""
                                size="sm"
                                label={"Check No"}
                                control={form.control}
                                name="data.checkNo"
                            />
                            <FormInput
                                className=""
                                size="sm"
                                label={"Amount"}
                                control={form.control}
                                type="number"
                                name="data.amount"
                            />
                            <div className="col-span-2 flex justify-end space-x-4">
                                <Button
                                    variant={"destructive"}
                                    size={"sm"}
                                    onClick={() => {
                                        form.setValue("showForm", false);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Btn
                                    isLoading={loading}
                                    size={"sm"}
                                    onClick={pay}
                                >
                                    Pay
                                </Btn>
                            </div>
                        </div>
                    </Form>
                )}
            </div>
        </Modal.Content>
    );
}
