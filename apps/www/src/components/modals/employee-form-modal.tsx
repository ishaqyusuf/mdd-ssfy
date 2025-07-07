import { useEmployeesParams } from "@/hooks/use-employee-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { employeeFormSchema } from "@api/schemas/hrm";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { Form } from "@gnd/ui/form";
import { z } from "zod";
import FormInput from "../common/controls/form-input";

import { SubmitButton } from "../submit-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useEffect } from "react";

export function EmployeeFormModal({}) {
    const { setParams, params, opened } = useEmployeesParams();
    const form = useZodForm(employeeFormSchema, {
        defaultValues: {},
    });
    const trpc = useTRPC();
    const submitAction = useMutation(
        trpc.hrm.saveEmployee.mutationOptions({
            onSuccess(data, variables, context) {},
            onError(error, variables, context) {},
        }),
    );
    const q = useQuery(
        trpc.hrm.getEmployeeForm.queryOptions(
            {
                id: params?.editEmployeeId,
            },
            {
                enabled: !!params.editEmployeeId,
            },
        ),
    );

    useEffect(() => {
        form.reset(q.data || {});
    }, [q.data]);
    function onSubmit(values: z.infer<typeof employeeFormSchema>) {}
    return (
        <Dialog
            open={opened}
            onOpenChange={(e) => {
                setParams(null);
            }}
        >
            <DialogContent
                onOpenAutoFocus={(evt) => evt.preventDefault()}
                className=""
            >
                <DialogHeader className="">
                    <DialogTitle>Employee Form</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <FormInput
                            control={form.control}
                            name="name"
                            label="Name"
                        />
                        <FormInput
                            control={form.control}
                            name="username"
                            disabled
                            label="Username"
                        />
                        <FormInput
                            control={form.control}
                            name="email"
                            label="Email"
                        />
                        <FormInput
                            control={form.control}
                            name="phoneNo"
                            label="Phone No"
                        />
                        <DialogFooter>
                            <SubmitButton
                                isSubmitting={submitAction.isPending}
                                disabled={submitAction.isPending}
                            >
                                Submit
                            </SubmitButton>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

