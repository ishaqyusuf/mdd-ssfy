import { CreateEmployeeProfile } from "@/actions/create-employee-profile";
import { CreateRoleForm } from "@/actions/create-role-action";
import {
    createEmployeeProfileSchema,
    createRoleSchema,
} from "@/actions/schema.hrm";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useFormContext } from "react-hook-form";

export function EmployeeProfileForm({ children }) {
    const form = useForm<CreateEmployeeProfile>({
        resolver: zodResolver(createEmployeeProfileSchema),
        defaultValues: {
            title: "",
            discount: null,
            commission: null,
        },
    });

    return <FormProvider {...form}>{children}</FormProvider>;
}

export const useEmployeeProfileFormContext = () =>
    useFormContext<CreateRoleForm>();
