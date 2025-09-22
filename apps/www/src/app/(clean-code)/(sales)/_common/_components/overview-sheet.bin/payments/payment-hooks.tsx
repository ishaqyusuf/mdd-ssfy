import { useEffect, useState } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { PaymentMethods } from "@/app/(clean-code)/(sales)/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
    cancelSalesPaymentCheckoutUseCase,
    checkTerminalPaymentStatusUseCase,
    GetPaymentTerminals,
    GetSalesPayment,
    getSalesPaymentUseCase,
} from "../../../use-case/sales-payment-use-case";

export const usePayment = (ctx) => {
    return usePaymentContext(ctx);
};
const usePaymentContext = (ctx) => {
    // const ctx = useSalesOverview();
    const orderId = ctx.item.id;
    const [data, setData] = useState<GetSalesPayment>(null as any);
    const [ready, setReady] = useState(false);
    const form = useForm({
        resolver: zodResolver(
            z.object({
                amount: z.number(),
            }),
        ),
        defaultValues: {
            paymentMethod: null as PaymentMethods,
            amount: null,
            deviceId: null,
            enableTip: false,
            terminal: null as GetPaymentTerminals,
            checkoutId: null,
            checkNo: null,
        },
    });

    const [paymentMethod, terminals, checkoutId] = form.watch([
        "paymentMethod",
        "terminal.devices",
        "checkoutId",
    ]);
    const isTerminal = () => paymentMethod == "terminal";
    useEffect(() => {
        load();
    }, []);
    async function load() {
        if (ctx.item.type == "order")
            getSalesPaymentUseCase(orderId)
                .then((result) => {
                    setData(result);
                    setReady(true);
                    _ctx.orderId = orderId;
                })
                .catch((e) => {
                    toast.error(e.message);
                });
    }
    // const [waitingForPayment, setWaitingForPayment] = useState(false);
    useEffect(() => {
        checkPayment();
    }, [checkoutId]);
    async function checkPayment() {
        if (!checkoutId) return;
        const timeout = setTimeout(async () => {
            if (checkoutId) {
                toast.error("Payment status check timed out");
                _ctx.cancelTerminalPayment();
            }
        }, 20000);

        while (true) {
            await new Promise((r) => setTimeout(r, 2000));

            if (!checkoutId) {
                _ctx.closePaymentForm();
                toast.error("Something went wrong");
                break;
            }
            const status = await checkTerminalPaymentStatusUseCase(checkoutId);
            if (status?.success) {
                clearTimeout(timeout);
                _ctx.closePaymentForm();
                toast.success(status.success);
                break;
            }
            if (status?.error) {
                clearTimeout(timeout);
                toast.error(status.error);
                _ctx.cancelTerminalPayment();
                break;
            }
        }
    }
    // const [inProgress, setInProgress] = useState(false);
    const [isLoading, startTransition] = useTransition();

    // useEffect(() => {
    //     if (paymentMethod == "terminal" && !terminals?.length) {
    //         getPaymentTerminalsUseCase()
    //             .then((terminal) => {
    //                 form.setValue("terminal", terminal);
    //                 form.setValue("deviceId", terminal?.lastUsed?.value);
    //             })
    //             .catch((e) => {
    //                 toast.error(e.message);
    //                 form.setError("paymentMethod", {
    //                     message: e.message,
    //                 });
    //             });
    //     }
    // }, [paymentMethod, terminals, form]);
    async function _pay() {
        if (isTerminal()) await terminalCheckout();
        else {
            try {
                const formData = form.getValues();
                // const r = await createTransactionUseCase({
                //     accountNo: ctx.item.customerPhone,
                //     amount: +formData.amount,
                //     paymentMode: formData.paymentMethod,
                //     salesIds: [ctx.item.id],
                //     description: "",
                // });
                _ctx.closePaymentForm();
                toast.success("Payment Applied");
            } catch (error) {
                toast.error(error.message);
            }
        }
    }
    async function terminalCheckout() {
        const e = await form.trigger(); //.then((e) => {
        const formData = form.getValues();
        // startTransition(async () => {
        //     if (e) {
        //         if (!formData.deviceId && isTerminal()) {
        //             form.setError("deviceId", {});
        //             return;
        //         }
        //         // if (isTerminal()) {
        //         //     const resp = await createTerminalPaymentUseCase({
        //         //         salesPayment: {
        //         //             amount: Number(formData.amount),
        //         //             orderId,
        //         //             terminalId: formData.deviceId,
        //         //             paymentType: "square_terminal",
        //         //         },
        //         //         terminal: {
        //         //             amount: Number(formData.amount),
        //         //             deviceId: formData.deviceId,
        //         //             allowTipping: formData.enableTip,
        //         //         },
        //         //     });

        //         //     if (resp.error) toast.error(resp.error.message);
        //         //     else {
        //         //         form.setValue("checkoutId", resp.resp.salesPayment.id);
        //         //         // setWaitingForPayment(true);
        //         //     }
        //         // }
        //     }
        // });
        // });
    }
    const _ctx = {
        orderId,
        _pay,
        terminals,
        ready,
        data,
        load,
        inProgress: isLoading,
        waitingForPayment: checkoutId != null,
        form,
        isTerminal,
        paymentMethod,
        async createPayment(pm) {
            form.setValue("amount", data.amountDue);
            if (pm == "terminal") {
            } else {
            }
            form.setValue("paymentMethod", pm);
            form.clearErrors();
        },
        closePaymentForm() {
            // form.setValue("paymentMethod", null);
            form.reset({});
            // setWaitingForPayment(false);
        },
        async cancelTerminalPayment() {
            await cancelSalesPaymentCheckoutUseCase(checkoutId);
            form.setValue("checkoutId", null);
            // setWaitingForPayment(false);
        },
        terminalCheckout,
    };

    return _ctx;
};
