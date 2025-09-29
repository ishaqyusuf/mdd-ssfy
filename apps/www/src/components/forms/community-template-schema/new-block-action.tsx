"use client";
import Button from "@/components/common/button";
import { SubmitButton } from "@/components/submit-button";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { createCommunityTemplateBlockSchema } from "@community/community-template-schemas";
import { Popover } from "@gnd/ui/composite";
import { FormInput } from "@gnd/ui/controls/form-input";
import { Form } from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTemplateBlocksContext } from "./context";
import { FormDebugBtn } from "@/components/form-debug-btn";
import { _qc, _trpc } from "@/components/static-trpc";

export function NewBlockAction() {
    const c = useTemplateBlocksContext();
    const [formOpen, onFormOpenChange] = useState(false);
    const { isPending, mutate } = useMutation(
        _trpc.community.createCommunityTemplateBlock.mutationOptions({
            onSuccess(data, variables, context) {
                _qc.invalidateQueries({
                    queryKey: _trpc.community.getCommunitySchema.queryKey({}),
                });
            },
            onError(error, variables, context) {},
        }),
    );
    const form = useZodForm(createCommunityTemplateBlockSchema, {
        defaultValues: {
            categoryId: c?.category?.id,
            title: "",
        },
    });
    useEffect(() => {
        form.reset({
            categoryId: c?.category?.id,
            title: "",
        });
    }, []);
    const onSubmit = (data) => {
        mutate(data);
    };
    return (
        <Popover.Root open={formOpen} onOpenChange={onFormOpenChange}>
            <Popover.Trigger asChild>
                <Button size="sm" variant="secondary">
                    <Icons.Edit className="size-4" />
                </Button>
            </Popover.Trigger>
            <Popover.Content className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="leading-none font-medium">
                            Template Block
                        </h4>
                        <p className="text-muted-foreground text-sm">
                            create new community template block
                        </p>
                    </div>
                    <Form {...form}>
                        <form
                            className="grid gap-2"
                            onSubmit={form.handleSubmit(onSubmit)}
                        >
                            <FormInput
                                control={form.control}
                                name="title"
                                label="Title"
                            />
                            <div className="flex gap-4 justify-end">
                                <FormDebugBtn />
                                <SubmitButton isSubmitting={isPending}>
                                    Save
                                </SubmitButton>
                            </div>
                        </form>
                    </Form>
                </div>
            </Popover.Content>
        </Popover.Root>
    );
}

