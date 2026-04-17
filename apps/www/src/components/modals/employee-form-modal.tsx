import { useEmployeeParams } from "@/hooks/use-employee-params";
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
import FormSelect from "../common/controls/form-select";

import { SubmitButton } from "../submit-button";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { useTRPC } from "@/trpc/client";
import { useEffect } from "react";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import {
    useOrganizationList,
    useProfilesList,
    useRolesList,
} from "@/hooks/use-data-list";
import { invalidateInfiniteQueries } from "@/hooks/use-invalidate-query";

export function EmployeeFormModal({}) {
    const { setParams, params, opened } = useEmployeeParams();
    const form = useZodForm(employeeFormSchema, {
        defaultValues: {},
    });
    const trpc = useTRPC();
    const toast = useLoadingToast();
    const submitAction = useMutation(
        trpc.hrm.saveEmployee.mutationOptions({
            onSuccess(data, variables, context) {
                toast.success("Saved");
                form.reset();
                invalidateInfiniteQueries("hrm.getEmployees");
                setParams(null);
            },
            onError(error, variables, context) {
                toast.error("Unable to complete");
            },
        }),
    );
    const roles = useRolesList(opened);
    const profiles = useProfilesList(opened);
    const organizations = useOrganizationList(opened);
    const roleOptions = roles.map((role) => ({
        ...role,
        id: String(role.id),
    }));
    const profileOptions = profiles.map((profile) => ({
        ...profile,
        id: String(profile.id),
    }));
    const organizationOptions = organizations.map((organization) => ({
        ...organization,
        id: String(organization.id),
    }));
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
        if (!opened) return;

        if (params?.editEmployeeId) {
            if (q.data) {
                form.reset({
                    ...q.data,
                    roleId: String(q.data.roleId) as any,
                    organizationId: String(q.data.organizationId) as any,
                    profileId: q.data.profileId
                        ? (String(q.data.profileId) as any)
                        : null,
                });
            }
            return;
        }

        form.reset({
            name: "",
            email: "",
            phoneNo: "",
            username: null,
            password: "Millwork",
            profileId: null,
            roleId: roleOptions[0]?.id as any,
            organizationId: organizationOptions[0]?.id as any,
        });
    }, [
        form,
        opened,
        organizationOptions,
        params?.editEmployeeId,
        q.data,
        roleOptions,
    ]);
    function onSubmit(values: z.infer<typeof employeeFormSchema>) {
        toast.loading("Saving employee");
        submitAction.mutate(values);
    }
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
                        <FormSelect
                            control={form.control}
                            name="roleId"
                            label="Role"
                            placeholder="Select role"
                            options={roleOptions}
                            valueKey="id"
                            titleKey="name"
                        />
                        <FormSelect
                            control={form.control}
                            name="organizationId"
                            label="Office"
                            placeholder="Select office"
                            options={organizationOptions}
                            valueKey="id"
                            titleKey="name"
                        />
                        <FormSelect
                            control={form.control}
                            name="profileId"
                            label="Profile"
                            placeholder="Select profile"
                            options={profileOptions}
                            valueKey="id"
                            titleKey="name"
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
