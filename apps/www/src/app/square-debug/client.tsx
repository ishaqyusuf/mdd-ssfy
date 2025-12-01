"use client";

import { SubmitButton } from "@gnd/ui/submit-button";
import { testRun } from "./action";
import { useTransition } from "react";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";

export function Action({ deviceId }) {
    // const { isPending: isRunning, mutate: startRunning } = useMutation(
    //     _trpc.squareTest.test.mutationOptions({
    //         onSuccess(data, variables, onMutateResult, context) {
    //             console.log([data]);
    //         },
    //         onError(error, variables, onMutateResult, context) {
    //             console.log({
    //                 error,
    //             });
    //         },
    //     })
    // );
    const [isRunning, startTransistion] = useTransition();
    const startRunning = async () => {
        startTransistion(async () => {
            await testRun(deviceId);
        });
    };
    return (
        <SubmitButton
            isSubmitting={isRunning}
            type="button"
            onClick={(e) => {
                startRunning();
            }}
        >
            TEST
        </SubmitButton>
    );
}

