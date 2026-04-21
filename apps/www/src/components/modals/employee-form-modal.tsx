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
import { useEffect, useMemo } from "react";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import {
    useOrganizationList,
    useProfilesList,
    usePermissionsList,
    useRolesList,
} from "@/hooks/use-data-list";
import { invalidateInfiniteQueries } from "@/hooks/use-invalidate-query";
import { Checkbox } from "@gnd/ui/checkbox";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { TCell } from "../(clean-code)/data-table/table-cells";

function getEmployeeFormDefaults() {
    return {
        name: "",
        email: "",
        phoneNo: "",
        username: "",
        password: "Millwork",
        profileId: null,
        permissionIds: [] as number[],
        roleId: "",
        organizationId: "",
    };
}

export function EmployeeFormModal({}) {
    const { setParams, params, opened } = useEmployeeParams();
    const form = useZodForm(employeeFormSchema, {
        defaultValues: getEmployeeFormDefaults(),
    });
    const trpc = useTRPC();
    const toast = useLoadingToast();
    const submitAction = useMutation(
        trpc.hrm.saveEmployee.mutationOptions({
            onSuccess(data, variables, context) {
                toast.success("Saved");
                form.reset(getEmployeeFormDefaults());
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
    const permissions = usePermissionsList(opened);
    const organizations = useOrganizationList(opened);
    const roleOptions = useMemo(
        () =>
            roles.map((role) => ({
                ...role,
                id: String(role.id),
            })),
        [roles],
    );
    const profileOptions = useMemo(
        () =>
            profiles.map((profile) => ({
                ...profile,
                id: String(profile.id),
            })),
        [profiles],
    );
    const organizationOptions = useMemo(
        () =>
            organizations.map((organization) => ({
                ...organization,
                id: String(organization.id),
            })),
        [organizations],
    );
    const defaultRoleId = roleOptions[0]?.id ?? "";
    const defaultOrganizationId = organizationOptions[0]?.id ?? "";
    const selectedPermissionIds = form.watch("permissionIds") || [];
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
            if (!q.data) return;
            form.reset({
                ...getEmployeeFormDefaults(),
                ...q.data,
                email: q.data.email ?? "",
                phoneNo: q.data.phoneNo ?? "",
                username: q.data.username ?? "",
                roleId: String(q.data.roleId),
                organizationId: String(q.data.organizationId),
                profileId: q.data.profileId ? String(q.data.profileId) : null,
            });
            return;
        }

        if (!defaultRoleId || !defaultOrganizationId) return;
        form.reset({
            ...getEmployeeFormDefaults(),
            roleId: defaultRoleId,
            organizationId: defaultOrganizationId,
        });
    }, [
        opened,
        params?.editEmployeeId,
        q.data?.id,
        defaultOrganizationId,
        defaultRoleId,
        form,
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
                className="flex h-[80vh] max-h-[720px] w-full max-w-2xl flex-col overflow-hidden"
            >
                <DialogHeader className="">
                    <DialogTitle>Employee Form</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="flex min-h-0 flex-1 flex-col gap-4"
                    >
                        <Tabs
                            defaultValue="general"
                            className="flex min-h-0 flex-1 flex-col gap-4"
                        >
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="general">
                                    General
                                </TabsTrigger>
                                <TabsTrigger value="permissions">
                                    Permissions {selectedPermissionIds.length}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent
                                value="general"
                                className="min-h-0 flex-1 overflow-y-auto pr-2"
                            >
                                <div className="space-y-4">
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
                                </div>
                            </TabsContent>

                            <TabsContent
                                value="permissions"
                                className="min-h-0 flex-1 overflow-hidden"
                            >
                                <div className="flex h-full min-h-0 flex-col gap-3">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">
                                            Specific Permissions
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            These are merged with the employee&apos;s
                                            role permissions on login.
                                        </p>
                                    </div>
                                    <ScrollArea className="min-h-0 flex-1 rounded-md border p-3">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>
                                                        Permissions
                                                    </TableHead>
                                                    <TableHead className="w-24">
                                                        Create
                                                    </TableHead>
                                                    <TableHead className="w-24">
                                                        Edit
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {permissions.map((permission) => {
                                                    const createChecked = permission.viewPermissionId
                                                        ? selectedPermissionIds.includes(
                                                              permission.viewPermissionId,
                                                          )
                                                        : false;
                                                    const editChecked = permission.editPermissionId
                                                        ? selectedPermissionIds.includes(
                                                              permission.editPermissionId,
                                                          )
                                                        : false;

                                                    const togglePermission = (
                                                        permissionId: number | undefined,
                                                        checked: boolean,
                                                    ) => {
                                                        if (!permissionId) return;
                                                        const current =
                                                            form.getValues(
                                                                "permissionIds",
                                                            ) || [];
                                                        const next = checked
                                                            ? current.filter(
                                                                  (id) =>
                                                                      id !==
                                                                      permissionId,
                                                              )
                                                            : [
                                                                  ...current,
                                                                  permissionId,
                                                              ];
                                                        form.setValue(
                                                            "permissionIds",
                                                            Array.from(
                                                                new Set(next),
                                                            ),
                                                            {
                                                                shouldDirty: true,
                                                            },
                                                        );
                                                    };

                                                    return (
                                                        <TableRow key={permission.key}>
                                                            <TableCell>
                                                                <TCell.Secondary className="font-mono$ uppercase">
                                                                    {permission.key}
                                                                </TCell.Secondary>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Checkbox
                                                                    checked={createChecked}
                                                                    disabled={!permission.viewPermissionId}
                                                                    onCheckedChange={() =>
                                                                        togglePermission(
                                                                            permission.viewPermissionId,
                                                                            createChecked,
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Checkbox
                                                                    checked={editChecked}
                                                                    disabled={!permission.editPermissionId}
                                                                    onCheckedChange={() =>
                                                                        togglePermission(
                                                                            permission.editPermissionId,
                                                                            editChecked,
                                                                        )
                                                                    }
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>
                            </TabsContent>
                        </Tabs>
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
