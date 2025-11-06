"use client";

import { useMutation, useQuery, useSuspenseQuery } from "@gnd/ui/tanstack";
import { _trpc } from "./static-trpc";
import { useDebugToast } from "@/hooks/use-debug-console";
import { Card } from "@gnd/ui/card";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@gnd/ui/button";
import { useEffect, useMemo, useTransition } from "react";
import { timeout } from "@/lib/timeout";
import { openLink } from "@/lib/open-link";
import { toast } from "@gnd/ui/use-toast";

interface Props {
    token: string;
}
export function SquareTokenCheckout(props: Props) {
    const { data, error } = useSuspenseQuery(
        _trpc.checkout.initializeCheckout.queryOptions(
            {
                token: props.token,
            },
            {
                enabled: !!props.token,
            }
        )
    );
    const paymentId = data?.payload?.paymentId;
    const {
        isPending: isVerifying,
        data: verifyData,
        error: verifyError,
        mutate,
    } = useMutation(
        _trpc.checkout.verifyPayment.mutationOptions({
            onSuccess(data, variables, onMutateResult, context) {
                // Optional: Handle success (e.g., show a success message)
                toast({
                    title: "Payment Verified",
                    description: "Your payment has been successfully verified.",
                    status: "success",
                });
            },
            onError(error, variables, context) {
                // Optional: Handle error (e.g., show an error message)
                // toast({
                //     title: "Payment Verification Failed",
                //     description: error.message,
                //     status: "error",
                // });
                let v = variables as any;
                if (v.attempts < 3) {
                    setTimeout(() => {
                        mutate({
                            paymentId: v.paymentId,
                            attempts: v.attempts + 1,
                        });
                    }, 3000);
                }
            },
        })
    );
    // const {
    //     mutateAsync: verifyPayment,
    //     data: verifyData,
    //     error: verifyError,
    //     isPending,
    // } = useMutation(_trpc.checkout.verifyPayment.mutationOptions());
    useEffect(() => {
        if (paymentId) mutate({ paymentId, attempts: 1 }); // ✅ called once
    }, [paymentId]);

    const status = useMemo(() => {
        if (!paymentId)
            return {
                title: "Payment Token Validated",
                description: "You can proceed to complete your payment.",
            };
        return {
            title:
                "Payment " +
                (verifyData?.status === "COMPLETED"
                    ? "Successful"
                    : verifyData?.status === "FAILED"
                    ? "Failed"
                    : "Pending"),
            description:
                verifyData?.status === "COMPLETED"
                    ? "Your payment has been completed successfully."
                    : verifyData?.status === "FAILED"
                    ? "Your payment has failed. Please try again."
                    : "Your payment is being processed. Please wait.",
        };
    }, [paymentId, verifyData, data, verifyError]);
    const { mutate: createCheckout, isPending: isProcessing } = useMutation(
        _trpc.checkout.createSalesCheckoutLink.mutationOptions({
            onSuccess(data, variables, onMutateResult, context) {
                if (data.paymentLink) {
                    openLink(data.paymentLink);
                }
            },
        })
    );
    useDebugToast("data", { data, error });
    const payload = data?.payload;
    const handlePayment = () => {
        createCheckout({ token: props.token });
    };
    if (!data?.payload) return <InvalidToken />;
    if (!data?.sales?.length)
        return <ExpiredToken merchantName={data.customerName} />;
    return (
        <Card className="p-8 shadow-lg space-y-6">
            <div className="flex items-center justify-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-green-500 rounded-full opacity-20 scale-150 animate-pulse" />
                    <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400 relative" />
                </div>
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {status?.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    {/* Your payment token is valid and ready to process */}
                    {status?.description}
                </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Merchant
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {data.customerName}
                    </span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Amount
                    </span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                        USD {payload.amount.toFixed(2)}
                    </span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Token ID
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-500">
                        {props.token.slice(0, 8)}...
                    </span>
                </div>
            </div>

            {data?.payload?.paymentId ? (
                <></>
            ) : (
                <Button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50"
                >
                    {isProcessing ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                        </span>
                    ) : (
                        "Complete Payment"
                    )}
                </Button>
            )}
            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                Your payment is secure and encrypted
            </p>
        </Card>
    );
}
function ExpiredToken({ merchantName }) {
    return (
        <Card className="p-8 shadow-lg space-y-6">
            <div className="flex items-center justify-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-amber-500 rounded-full opacity-20 scale-150 animate-pulse" />
                    <Clock className="w-16 h-16 text-amber-600 dark:text-amber-400 relative" />
                </div>
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Token Expired
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Your payment token has expired and is no longer valid
                </p>
            </div>

            <Alert className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                    Payment tokens expire after 1 hour. Please request a new
                    token to continue.
                </AlertDescription>
            </Alert>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Merchant
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {merchantName}
                    </span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                {/* <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Amount
                    </span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {token.currency} {token.amount.toFixed(2)}
                    </span>
                </div> */}
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                {/* <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Expired At
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-500">
                        {token.expiresAt.toLocaleTimeString()}
                    </span>
                </div> */}
            </div>

            <Button
                // onClick={handleRetry}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold py-3 rounded-lg transition-all duration-200"
            >
                Request New Token
            </Button>

            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                Contact support if you need assistance
            </p>
        </Card>
    );
}
function InvalidToken() {
    const handleRetry = () => {};
    return (
        <Card className="p-8 shadow-lg space-y-6">
            <div className="flex items-center justify-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500 rounded-full opacity-20 scale-150 animate-pulse" />
                    <AlertCircle className="w-16 h-16 text-red-600 dark:text-red-400 relative" />
                </div>
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Invalid Token
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    The payment token provided is invalid or corrupted
                </p>
            </div>

            <Alert className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                    This token cannot be used for payment. Please verify the
                    token and try again.
                </AlertDescription>
            </Alert>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-mono break-all">
                    Error: Invalid token format or signature mismatch
                </p>
            </div>

            <div className="space-y-2">
                <Button
                    onClick={handleRetry}
                    className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg transition-all duration-200"
                >
                    Try Again
                </Button>
                <Button
                    variant="outline"
                    className="w-full border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold py-3 rounded-lg bg-transparent"
                >
                    Contact Support
                </Button>
            </div>

            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                Our support team is available 24/7
            </p>
        </Card>
    );
}

