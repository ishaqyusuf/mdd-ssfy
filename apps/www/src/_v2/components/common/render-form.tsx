"use client";

import { env } from "@/env.mjs";
import { cn } from "@/lib/utils";
import { FormProvider, useFormContext } from "react-hook-form";

import { Form } from "@gnd/ui/form";

let reRender = 0;
export default function RenderForm({
    children,
    ...props
}: {
    children?;
} & any) {
    const form = useFormContext();
    const isProd = env.NEXT_PUBLIC_NODE_ENV === "production";
    if (!isProd) reRender++;
    // else return <>{children}</>;
    if (!form)
        return <ContextRenderForm {...props}>{children}</ContextRenderForm>;
    // form.formState.isDirty
    return (
        <>
            <div
                className={cn(
                    "flex",
                    isProd
                        ? "hidden"
                        : "fixed right-[50%] top-0 z-[9999] rounded-full bg-red-500 p-1 px-2  text-xs font-semibold leading-none text-white",
                )}
            >
                {/* <p>Render: {reRender}</p> */}
                <p>
                    Dirty Fields:{" "}
                    {Object.keys(form.formState.dirtyFields)?.length}
                </p>
                <p>Submission: {form.formState.submitCount}</p>
                {/* <p>Submission: {form.formState.}</p> */}
            </div>
            <Form {...props}>{children}</Form>
        </>
    );
}
let reCtxRender = 0;
function ContextRenderForm({ children, ...props }) {
    reCtxRender++;
    const isProd = env.NEXT_PUBLIC_NODE_ENV === "production";
    return (
        <FormProvider {...(props as any)}>
            <div
                className={cn(
                    "flex space-x-2",
                    isProd && "hidden",
                    "fixed right-[50%] top-0 z-[9999] rounded-full bg-red-500 p-1 px-2  text-xs font-semibold leading-none text-white",
                )}
            >
                <p>Render: {reCtxRender}</p>
                <p>
                    Dirty Fields:{" "}
                    {Object.keys(props.formState.dirtyFields)?.length}
                </p>
                <p>Submission: {props.formState.submitCount}</p>
                {/* <p>Submission: {form.formState.}</p> */}
            </div>
            <Form {...(props as any)}>{children}</Form>
        </FormProvider>
    );
}
