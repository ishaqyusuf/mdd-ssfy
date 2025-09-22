import { DykeStepMeta } from "@/app/(v2)/(loggedIn)/sales-v2/type";
import { SubmitButton } from "@/components/submit-button";
import { debugToast } from "@/hooks/use-debug-console";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { saveSupplierSchema } from "@api/db/queries/sales-form";
import { Button } from "@gnd/ui/button";
import { FormInput } from "@gnd/ui/controls/form-input";
import { Form } from "@gnd/ui/form";
import { useMutation } from "@tanstack/react-query";

interface Props {
    onCreate?;
    defaultValues?;
    onCancel?;
    onError?;
}
export function DoorSupplierForm({
    onCreate,
    defaultValues,
    onError,
    onCancel,
}: Props) {
    const form = useZodForm(saveSupplierSchema, {
        defaultValues: {
            id: undefined,
            name: undefined,
            ...(defaultValues || {}),
        },
    });
    const trpc = useTRPC();
    const { isPending, mutate, data } = useMutation(
        trpc.sales.saveSupplier.mutationOptions({
            onSuccess(data, variables, context) {
                setTimeout(() => {
                    onCreate?.(data);
                }, 2000);
            },
            onError(error, variables, context) {
                onError?.(error);
                debugToast("Error", error);
            },
            meta: {
                toastTitle: {
                    error: "Something went wrong",
                    loading: "Saving...",
                    success: "Success",
                },
            },
        }),
    );
    async function onSubmit(data: typeof saveSupplierSchema._type) {
        mutate(data);
    }
    return (
        <Form {...form}>
            <form
                className="flex gap-4 items-end"
                onSubmit={form.handleSubmit(onSubmit)}
            >
                <FormInput
                    label="Supplier"
                    control={form.control}
                    name="name"
                    className="flex-1"
                />
                <Button onClick={onCancel} type="button" variant="destructive">
                    Cancel
                </Button>
                <SubmitButton isSubmitting={isPending}>Save</SubmitButton>
            </form>
        </Form>
    );
}

