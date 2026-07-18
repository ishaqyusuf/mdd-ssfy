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
import type { z } from "zod";
import FormInput from "../common/controls/form-input";
import FormSelect from "../common/controls/form-select";

import {
	useOrganizationList,
	usePermissionsList,
	useProfilesList,
	useRolesList,
} from "@/hooks/use-data-list";
import { useInvalidateQuery } from "@/hooks/use-invalidate-query";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useTRPC } from "@/trpc/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { useCallback, useEffect, useMemo } from "react";
import { SubmitButton } from "../submit-button";
import { DataTable as EmployeeFormPermissionsTable } from "../tables-2/employee-form-permissions/data-table";

function getEmployeeFormDefaults() {
	return {
		name: "",
		email: "",
		phoneNo: "",
		username: "",
		password: "Millwork",
		profileId: null,
		permissionIds: [] as number[],
		roleId: 0,
		organizationId: 0,
	};
}

export function EmployeeFormModal() {
	const { setParams, params, opened } = useEmployeeParams();
	const { invalidateInfiniteQueries } = useInvalidateQuery();
	const form = useZodForm(employeeFormSchema, {
		defaultValues: getEmployeeFormDefaults(),
	});
	const { getValues, reset, setValue, watch } = form;
	const trpc = useTRPC();
	const toast = useLoadingToast();
	const submitAction = useMutation(
		trpc.hrm.saveEmployee.mutationOptions({
			onSuccess() {
				toast.success("Saved");
				reset(getEmployeeFormDefaults());
				invalidateInfiniteQueries("hrm.getEmployees");
				setParams(null);
			},
			onError() {
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
				id: role.id,
			})),
		[roles],
	);
	const profileOptions = useMemo(
		() =>
			profiles.map((profile) => ({
				...profile,
				id: profile.id,
			})),
		[profiles],
	);
	const organizationOptions = useMemo(
		() =>
			organizations.map((organization) => ({
				...organization,
				id: organization.id,
			})),
		[organizations],
	);
	const defaultRoleId = roleOptions[0]?.id ?? 0;
	const defaultOrganizationId = organizationOptions[0]?.id ?? 0;
	const selectedPermissionIds = watch("permissionIds") || [];
	const permissionRows = useMemo(
		() =>
			permissions.map((permission) => ({
				uid: `employee-permission-${permission.key}`,
				key: permission.key,
				viewPermissionId: permission.viewPermissionId,
				editPermissionId: permission.editPermissionId,
			})),
		[permissions],
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
	const employeeFormData = q.data;

	useEffect(() => {
		if (!opened) return;

		if (params?.editEmployeeId) {
			if (!employeeFormData) return;
			reset({
				...getEmployeeFormDefaults(),
				...employeeFormData,
				email: employeeFormData.email ?? "",
				phoneNo: employeeFormData.phoneNo ?? "",
				username: employeeFormData.username ?? "",
				roleId: employeeFormData.roleId,
				organizationId: employeeFormData.organizationId,
				profileId: employeeFormData.profileId,
			});
			return;
		}

		if (!defaultRoleId || !defaultOrganizationId) return;
		reset({
			...getEmployeeFormDefaults(),
			roleId: defaultRoleId,
			organizationId: defaultOrganizationId,
		});
	}, [
		opened,
		params?.editEmployeeId,
		employeeFormData,
		defaultOrganizationId,
		defaultRoleId,
		reset,
	]);
	function onSubmit(values: z.infer<typeof employeeFormSchema>) {
		toast.loading("Saving employee");
		submitAction.mutate(values);
	}
	const togglePermission = useCallback(
		(permissionId: number | undefined, checked: boolean) => {
			if (!permissionId) return;
			const current = getValues("permissionIds") || [];
			const next = checked
				? current.filter((id) => id !== permissionId)
				: [...current, permissionId];
			setValue("permissionIds", Array.from(new Set(next)), {
				shouldDirty: true,
			});
		},
		[getValues, setValue],
	);
	return (
		<Dialog
			open={opened}
			onOpenChange={() => {
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
								<TabsTrigger value="general">General</TabsTrigger>
								<TabsTrigger value="permissions">
									Permissions {selectedPermissionIds.length}
								</TabsTrigger>
							</TabsList>

							<TabsContent
								value="general"
								className="min-h-0 flex-1 overflow-y-auto pr-2"
							>
								<div className="space-y-4">
									<FormInput control={form.control} name="name" label="Name" />
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
										<p className="text-sm font-medium">Specific Permissions</p>
										<p className="text-xs text-muted-foreground">
											These are merged with the employee&apos;s role permissions
											on login.
										</p>
									</div>
									<EmployeeFormPermissionsTable
										data={permissionRows}
										selectedPermissionIds={selectedPermissionIds}
										onTogglePermission={togglePermission}
									/>
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
