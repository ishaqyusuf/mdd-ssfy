import type { PermissionScope, Roles } from "@gnd/utils/constants";
import { z } from "zod";
import { paginationSchema } from "./common";

export const employeesQueryParamsSchema = z
  .object({
    q: z.string().optional().nullable(),
    can: z.array(z.custom<PermissionScope>()).optional().nullable(),
    cannot: z.array(z.custom<PermissionScope>()).optional().nullable(),
    roles: z.array(z.custom<Roles>()).optional().nullable(),
    role: z.string().optional().nullable(),
    profile: z.string().optional().nullable(),
  })
  .extend(paginationSchema.shape);
export type EmployeesQueryParams = z.infer<typeof employeesQueryParamsSchema>;
export type GetEmployeesSchema = EmployeesQueryParams;
export const employeeFormSchema = z
  .object({
    id: z.number().nullable().optional(),
    name: z.string(),
    email: z.string().optional(), // initially optional
    roleId: z.number(),
    organizationId: z.number(),
    profileId: z.number().optional().nullable(),
    phoneNo: z.string().optional().nullable(),
    username: z.string().optional().nullable(),
    password: z.string().nullable().optional().default("Millwork"),
  })

  .superRefine((data, ctx) => {
    if (data.id == null && !data.email) {
      ctx.addIssue({
        path: ["email"],
        code: z.ZodIssueCode.custom,
        message: "Email is required when ID is not provided.",
      });
    }
  });
export type EmployeeFormSchema = z.infer<typeof employeeFormSchema>;
export const getEmployeeFormDataSchema = z.object({
  id: z.number(),
});
export type GetEmployeeFormDataSchema = z.infer<
  typeof getEmployeeFormDataSchema
>;
const updateEmployeeRoleSchema = z.object({
  roleId: z.number(),
  userId: z.number(),
});
type UpdateEmployeeRoleSchema = z.infer<typeof updateEmployeeRoleSchema>;

const updateUserProfileSchema = z.object({
  name: z.string(),
  username: z.string().optional().nullable(),
  phoneNo: z.string().optional().nullable(),
});
export type UpdateUserProfileSchema = z.infer<typeof updateUserProfileSchema>;

export const loginByTokenSchema = z.object({
  token: z.string(),
});
export type LoginByTokenSchema = z.infer<typeof loginByTokenSchema>;
