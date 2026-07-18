import type { CreateRoleForm } from "@/actions/create-role-action";
import { createRoleSchema } from "@/actions/schema.hrm";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import {
	FormProvider,
	type Resolver,
	useForm,
	useFormContext,
} from "react-hook-form";

const createRoleResolver = zodResolver as unknown as (
	schema: typeof createRoleSchema,
) => Resolver<CreateRoleForm>;

export function RoleFormContext({ children }: { children: ReactNode }) {
	const form = useForm<CreateRoleForm>({
		resolver: createRoleResolver(createRoleSchema),
		defaultValues: {
			title: "",
			permissions: {},
		},
	});

	return <FormProvider {...form}>{children}</FormProvider>;
}

export const useRoleFormContext = () => useFormContext<CreateRoleForm>();
