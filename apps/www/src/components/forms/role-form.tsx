import { getRoleForm } from "@/actions/get-role-form";
import { DataSkeletonProvider } from "@/hooks/use-data-skeleton";
import { useRolesParams } from "@/hooks/use-roles-params";
import { useAsyncMemo } from "use-async-memo";
import FormInput from "../common/controls/form-input";
import { useRoleFormContext } from "../hrm/role-form-context";
import { useAction } from "next-safe-action/hooks";
import { createRoleAction } from "@/actions/create-role-action";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { skeletonListData } from "@/utils/format";
import { cn } from "@gnd/ui/cn";
import { DataSkeleton } from "../data-skeleton";
import { TCell } from "../(clean-code)/data-table/table-cells";
import FormCheckbox from "../common/controls/form-checkbox";
import { useEffect } from "react";
import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";
import { generateRandomString } from "@/lib/utils";
import { rndTimeout } from "@/lib/timeout";
import { SubmitButton } from "../submit-button";

export function RoleForm({}) {
    const { params, setParams } = useRolesParams();
    const form = useRoleFormContext();
    const data = useAsyncMemo(async () => {
        await rndTimeout();
        return await getRoleForm(params.roleEditId);
    }, [params?.roleEditId]);
    useEffect(() => {
        if (!data) return;
        form.reset(data.form);
    }, [data]);
    const action = useAction(createRoleAction, {
        onSuccess(args) {
            setParams({
                roleEditId: null,
                roleForm: null,
                refreshToken: generateRandomString(),
            });
        },
        onError(args) {
            // toast.error(args.message);
        },
    });
    const onSubmit = form.handleSubmit((values) => action.execute(values));
    return (
        <DataSkeletonProvider
            value={
                {
                    loading: !data?.permissionsList?.length,
                } as any
            }
        >
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
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Permissions</TableHead>
                                <TableHead>Create</TableHead>
                                <TableHead>Edit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {skeletonListData(
                                data?.permissionsList,
                                10,
                                "abc",
                            )?.map((tx, i) => (
                                <TableRow key={i} className={cn("")}>
                                    <TableCell>
                                        <DataSkeleton pok="date">
                                            <TCell.Secondary className="font-mono$ uppercase">
                                                {tx}
                                            </TCell.Secondary>
                                        </DataSkeleton>
                                    </TableCell>
                                    <TableCell>
                                        <DataSkeleton placeholder={"**"}>
                                            <FormCheckbox
                                                control={form.control}
                                                name={`permissions.view ${tx}.checked`}
                                            />
                                        </DataSkeleton>
                                    </TableCell>
                                    <TableCell>
                                        <DataSkeleton placeholder={"**"}>
                                            <FormCheckbox
                                                control={form.control}
                                                name={`permissions.edit ${tx}.checked`}
                                            />
                                        </DataSkeleton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </form>
            </Form>
        </DataSkeletonProvider>
    );
}
