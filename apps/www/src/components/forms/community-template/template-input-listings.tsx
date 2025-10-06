import { _trpc } from "@/components/static-trpc";
import { useMutation, useSuspenseQuery } from "@gnd/ui/tanstack";
import { Suspense } from "react";
import {
    useTemplateSchemaInputContext,
    useTemplateSchemaContext,
} from "./context";
import { useZodForm } from "@/hooks/use-zod-form";
import { saveTemplateInputListingSchema } from "@community/community-template-schemas";
import { Form } from "@gnd/ui/form";
import { FormInput } from "@gnd/ui/controls/form-input";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { EmptyState } from "@gnd/ui/custom/empty-state";
import { SubmitButton } from "@/components/submit-button";

export function TemplateInputListings() {
    return (
        <Suspense
            fallback={
                <>
                    <Skeletons.Table />
                </>
            }
        >
            <Content />
        </Suspense>
    );
}
function Content() {
    const ctx = useTemplateSchemaInputContext();
    const { mutate, isPending } = useMutation(
        _trpc.community.saveTemplateInputListing.mutationOptions({}),
    );
    const { data: listings } = useSuspenseQuery(
        _trpc.community.getTemplateInputListings.queryOptions({
            inputInventoryId: ctx.input?.inv.id,
        }),
    );
    const form = useZodForm(saveTemplateInputListingSchema, {
        defaultValues: {
            title: "",
        },
    });
    const onSubmit = (data) => {};
    return (
        <div>
            <Form {...form}>
                <form
                    className="flex gap-2 items-end"
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <FormInput
                        className="flex-1"
                        label="Create Listing"
                        control={form.control}
                        name="title"
                    />
                    <SubmitButton isSubmitting={isPending}>Save</SubmitButton>
                </form>
            </Form>
            {listings?.length || <EmptyState className="pt-12" />}
        </div>
    );
}

