import { CreateRoleForm } from "@/actions/create-role-action";
import { createRoleSchema } from "@/actions/schema.hrm";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useFormContext } from "react-hook-form";

export function RoleFormContext({ children }) {
    const form = useForm<CreateRoleForm>({
        resolver: zodResolver(createRoleSchema),
        defaultValues: {
            title: "",
            permissions: {},
        },
    });

    return <FormProvider {...form}>{children}</FormProvider>;
}

export const useRoleFormContext = () => useFormContext<CreateRoleForm>();

