import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { txStore } from "./store";
import { useEffect } from "react";

export const useTx = () => {
    const store = txStore();
    const form = useForm({
        resolver: zodResolver(
            z.object({
                amount: z.number(),
            })
        ),
        defaultValues: {
            // amount: sum(store.payables, "amountDue"),
            paymentMethod: store.paymentMethod,
            deviceId: null,
            enableTip: false,
            // terminal: null as GetPaymentTerminals,
            checkoutId: null,
            checkNo: null,
        },
    });
    const [pm] = form.watch(["paymentMethod"]);
    const isTerminal = () => pm == "terminal";
    useEffect(() => {}, []);
};
