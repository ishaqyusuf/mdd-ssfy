"use client";

import { useEffect, useState } from "react";
import { SquarePaymentStatus, validateSquarePayment } from "@/_v2/lib/square";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardFooter } from "@gnd/ui/card";

export default function SquarePaymentResponse({ params }) {
    const [paymentState, setPaymentState] =
        useState<SquarePaymentStatus>("PENDING");
    const { paymentId } = params;
    useEffect(() => {
        const timer = setTimeout(async () => {
            // setPaymentState(Math.random() > 0.5 ? "success" : "failure");
            const p = await validateSquarePayment(paymentId);
            console.log(p);
            // if(p.status == 'COMPLETED')
            setPaymentState(p.status);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    const resetPayment = () => {
        setPaymentState("PENDING");
        setTimeout(() => {
            setPaymentState(Math.random() > 0.5 ? "COMPLETED" : "FAILED");
        }, 3000);
    };

    return (
        <div className="flex h-screen flex-col items-center justify-center">
            <Card className="mx-auto w-full max-w-md">
                <CardContent className="flex min-h-[300px] flex-col items-center justify-center">
                    {paymentState === "PENDING" && (
                        <motion.div
                            className="flex flex-col items-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    ease: "linear",
                                }}
                            >
                                <Loader2 className="h-16 w-16 text-primary" />
                            </motion.div>
                            <p className="mt-4 text-lg font-medium">
                                Processing your payment...
                            </p>
                        </motion.div>
                    )}
                    {paymentState === "COMPLETED" && (
                        <motion.div
                            className="flex flex-col items-center text-center"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                            <h2 className="mt-4 text-2xl font-bold text-green-700">
                                Payment Successful!
                            </h2>
                            <p className="mt-2 text-gray-600">
                                Your payment has been processed successfully. A
                                confirmation email will be sent to your
                                registered email address.
                            </p>
                        </motion.div>
                    )}
                    {paymentState === "FAILED" && (
                        <motion.div
                            className="flex flex-col items-center text-center"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <XCircle className="h-16 w-16 text-red-500" />
                            <h2 className="mt-4 text-2xl font-bold text-red-700">
                                Payment Failed
                            </h2>
                            <p className="mt-2 text-gray-600">
                                {"We're"} sorry, but your payment could not be
                                processed. Please try again or contact support
                                for assistance.
                            </p>
                        </motion.div>
                    )}
                </CardContent>
                <CardFooter>
                    {paymentState === "FAILED" && (
                        <Button className="w-full" onClick={resetPayment}>
                            Try Again
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
