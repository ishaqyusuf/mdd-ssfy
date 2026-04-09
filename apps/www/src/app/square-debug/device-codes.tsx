"use client";

import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { createDeviceCode } from "./action";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";

export function DeviceCodes() {
    const { mutate: generate, isPending: isGenerating } = useMutation(
        _trpc.checkout.generateDeviceCode.mutationOptions({
            onSuccess(data, variables, onMutateResult, context) {
                console.log([data]);
            },
            onError(error, variables, onMutateResult, context) {
                console.log({
                    error,
                });
            },
            meta: {
                toastTitle: {
                    error: "Unable to complete",
                    loading: "Processing...",
                    success: "Done!.",
                },
            },
        })
    );
    return (
        <>
            <Label>Device Codes</Label>
            <Button
                onClick={(e) => {
                    generate({});
                }}
            >
                Create
            </Button>
        </>
    );
}

