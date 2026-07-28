import { createRoleAction } from "@/actions/create-role-action";
import { getRoleForm } from "@/actions/get-role-form";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useRolesParams } from "@/hooks/use-roles-params";
import { rndTimeout } from "@/lib/timeout";
import { generateRandomString } from "@/lib/utils";
import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";
import { useAction } from "next-safe-action/hooks";
import type { ComponentProps } from "react";
import { useEffect, useMemo } from "react";
import { useAsyncMemo } from "use-async-memo";
import FormInput from "../common/controls/form-input";
import { useRoleFormContext } from "../hrm/role-form-context";
import { SubmitButton } from "../submit-button";
import { DataTable as RoleFormPermissionsTable } from "../tables-2/role-form-permissions/data-table";

type DataSkeletonContextValue = NonNullable<
	ComponentProps<typeof DataSkeletonProvider>["value"]
>;

export function RoleForm() {
	const { params, setParams } = useRolesParams();
	const form = useRoleFormContext();
	const { reset } = form;
	const toast = useLoadingToast();
	const data = useAsyncMemo(async () => {
		await rndTimeout();
		return await getRoleForm(params.roleEditId);
	}, [params?.roleEditId]);
	useEffect(() => {
		if (!data) return;
		reset(data.form);
	}, [data, reset]);
	const permissionRows = useMemo(
		() =>
			(data?.permissionsList?.length
				? data.permissionsList
				: Array.from({ length: 10 }, () => "permission")
			).map((permission, index) => ({
				uid: data?.permissionsList?.length
					? `permission-${permission}`
					: `permission-skeleton-${index}`,
				permission,
			})),
		[data?.permissionsList],
	);
	const dataSkeletonContext = useMemo(
		() =>
			({
				loading: !data?.permissionsList?.length,
			}) as DataSkeletonContextValue,
		[data?.permissionsList?.length],
	);
	const action = useAction(createRoleAction, {
		onSuccess(args) {
			setParams({
				roleEditId: null,
				roleForm: null,
				refreshToken: generateRandomString(),
			});
			toast.success("Role saved");
		},
		onError(args) {
			toast.error(args.error?.serverError || "Unable to save role");
		},
	});
	const onSubmit = form.handleSubmit(
		(values) => action.execute(values),
		() => {
			const titleError = form.formState.errors.title?.message;
			const permissionErrors = Object.keys(
				(form.formState.errors.permissions as Record<string, unknown>) || {},
			);
			toast.error(
				typeof titleError === "string"
					? titleError
					: permissionErrors.length
						? "Role permissions are still loading. Please try again."
						: "Please fix the role form and try again",
			);
		},
	);
	return (
		<DataSkeletonProvider value={dataSkeletonContext}>
			<Form {...form}>
				<form className="grid gap-4" onSubmit={onSubmit}>
					<div className="flex gap-2 items-end">
						<FormInput
							control={form.control}
							name="title"
							size="sm"
							label="Role Name"
							className="flex-1"
						/>
						<SubmitButton
							size="sm"
							type="submit"
							isSubmitting={action.isExecuting}
							disabled={!data}
						>
							Submit
						</SubmitButton>
						<Button
							variant="destructive"
							size="sm"
							type="button"
							onClick={() => {
								setParams({
									roleForm: null,
									roleEditId: null,
								});
							}}
						>
							Cancel
						</Button>
					</div>
					<RoleFormPermissionsTable
						data={permissionRows}
						control={form.control}
					/>
				</form>
			</Form>
		</DataSkeletonProvider>
	);
}
