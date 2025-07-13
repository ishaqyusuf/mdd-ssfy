"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { finalizeSalesCheckout } from "@/actions/finalize-sales-checkout";
import { salesPaymentCheckoutResponse } from "@/actions/sales-payment-checkout-response";
import { notifySalesRepPaymentSuccessAction } from "@/actions/triggers/sales-rep-payment-notification";
import { Icons } from "@/components/_v1/icons";
import { formatPaymentParams } from "@gnd/utils/sales";
import { motion } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";

export default function PaymentResponsePage(props) {
    const params = use(props.params);
    // const { emailToken, slug, paymentId } = params;
    const { emailToken, orderIdsParam, orderIds, paymentId } =
        formatPaymentParams(params);
    const [status, setStatus] = useState("processing");
    const [error, setError] = useState(null);
    const router = useRouter();

    const hasRun = useRef(false);
    useEffect(() => {
        if (hasRun.current) return; // prevent second run
        hasRun.current = true; // mark as run
        const processPayment = async () => {
            try {
                const response0 = await salesPaymentCheckoutResponse({
                    paymentId,
                });

                // return;
                await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate processing delay
                const response = await finalizeSalesCheckout({
                    salesPaymentId: paymentId,
                });
                await Promise.all(
                    response?.notifications?.map(async (not) => {
                        await notifySalesRepPaymentSuccessAction({
                            ...not,
                        });
                    }),
                );
                // const response = await salesPaymentCheckoutResponse({
                //     emailToken,
                //     slug,
                //     paymentId,
                // });
                // setStatus("error");
                setStatus("success");
                // setStatus(response.status);
            } catch (error) {
                setError(error.message);
                setStatus("error");
            }
        };
        processPayment();
    }, [emailToken, orderIdsParam, paymentId]);

    const getStatusMessage = () => {
        switch (status) {
            case "success":
                return {
                    text: "Payment Successful!",
                    color: "text-green-600",
                    icon: <CheckCircle className="h-12 w-12 text-green-500" />,
                };
            case "error":
                return {
                    text: `${error}`,
                    color: "text-red-600",
                    icon: <XCircle className="h-12 w-12 text-red-500" />,
                };
            default:
                return {
                    text: "Processing Transaction...",
                    color: "text-blue-600",
                    icon: (
                        <Icons.spinner className="h-12 w-12 animate-spin text-blue-500" />
                    ),
                };
        }
    };

    const { text, color, icon } = getStatusMessage();

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-lg"
            >
                <div className="flex flex-col items-center space-y-4">
                    {icon}
                    <motion.p
                        key={status} // Animate on status change
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`text-xl font-semibold ${color}`}
                    >
                        {text}
                    </motion.p>

                    {status === "success" && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="mt-4 w-full rounded-lg bg-green-600 py-2 text-white shadow transition hover:bg-green-700"
                            onClick={() => router.push("/dashboard")} // Redirect to dashboard or another page
                        >
                            Go to Dashboard
                        </motion.button>
                    )}

                    {status === "error" && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="mt-4 w-full rounded-lg bg-red-600 py-2 text-white shadow transition hover:bg-red-700"
                            onClick={() => router.push("/retry-payment")} // Retry payment if needed
                        >
                            Retry Payment
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

