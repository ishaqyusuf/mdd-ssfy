import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import Button from "@/components/common/button";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { _modal } from "@/components/common/modal/provider";
import { env } from "@/env.mjs";
import { cn } from "@/lib/utils";
import { Dot, FileWarning } from "lucide-react";

import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { SelectItem } from "@gnd/ui/select";

import { paymentMethods } from "../../utils/contants";
import { UsePayForm, usePayForm } from "./pay-form-ctx";

export default function PayForm({}) {
    const ctx = usePayForm();
    const { form, terminal, tx, pm, pay, terminalPay, totalPay } = ctx;
    const amount = form.watch("amount");
    if (!tx.phoneNo) return null;
    return (
        <Form {...form}>
            <div className="-m-4 grid gap-2 rounded-b-lg border-t bg-white p-4 shadow-lg sm:-m-6">
                {terminal ? (
                    <>
                        <ReceivingPayment ctx={ctx} />
                    </>
                ) : (
                    <>
                        {!tx.paymentMethod || (
                            <Form {...form}>
                                <div className="grid gap-4">
                                    <FormSelect
                                        size="sm"
                                        control={form.control}
                                        name="paymentMethod"
                                        options={paymentMethods}
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
                                    {pm == "check" ? (
                                        <FormInput
                                            control={form.control}
                                            name="checkNo"
                                            size="sm"
                                            label={"Check No."}
                                            disabled={tx.inProgress}
                                        />
                                    ) : pm == "terminal" ? (
                                        <>
                                            <FormSelect
                                                options={tx.terminals || []}
                                                control={form.control}
                                                size="sm"
                                                disabled={tx.inProgress}
                                                name="deviceId"
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
                                        </>
                                    ) : (
                                        <></>
                                    )}
                                </div>
                            </Form>
                        )}

                        <div className="flex items-center justify-end gap-4">
                            {pm != "terminal" || (
                                <>
                                    <FormCheckbox
                                        disabled={tx.inProgress}
                                        switchInput
                                        control={form.control}
                                        name="enableTip"
                                        label={"Enable Tip"}
                                    />
                                </>
                            )}
                            <Button
                                // disabled={!form.formState}
                                onClick={async () => {
                                    if (pm == "terminal") await terminalPay();
                                    else await pay();
                                }}
                                disabled={!form.formState.isValid}
                            >
                                Pay
                                <Money className="ml-2" value={amount} />
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Form>
    );
}
function ReceivingPayment({ ctx }: { ctx: UsePayForm }) {
    const paymentStatus = ctx.terminal?.status;
    return (
        <div className="">
            <div className={cn("hidden", "block rounded border p-2 shadow-sm")}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {paymentStatus == "COMPLETED" ? (
                            <>
                                <Icons.check className="h-4 w-4" />
                                <Label>Payment received...</Label>
                            </>
                        ) : paymentStatus == "CANCELED" ? (
                            <>
                                <FileWarning className="h-4 w-4" />
                                <Label>Payment Cancelled...</Label>
                            </>
                        ) : (
                            <>
                                <Icons.spinner className="h-4 w-4 animate-spin" />
                                <Label>Waiting for payment...</Label>
                            </>
                        )}
                    </div>
                    <div className="flex-1"></div>
                    {ctx.terminalWaitSeconds > 3 && (
                        <div>
                            <Button
                                onClick={ctx.paymentReceived}
                                size="xs"
                                className="h-6 bg-lime-600 p-2 text-xs"
                            >
                                Payment Received
                            </Button>
                        </div>
                    )}
                    <Button
                        variant="destructive"
                        className="h-6 p-2 text-xs"
                        onClick={ctx.cancelTerminalPayment}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
