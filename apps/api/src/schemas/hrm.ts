import { z } from "zod";

export const employeesQueryParamsSchema = z.object({});
export type EmployeesQueryParams = z.infer<typeof employeesQueryParamsSchema>;
export const employeeFormSchema = z
  .object({
    id: z.number().nullable().optional(),
    name: z.string(),
    email: z.string().optional(), // initially optional
    roleId: z.number().optional().nullable(),
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
export const updateEmployeeRoleSchema = z.object({
  roleId: z.number(),
  userId: z.number(),
});
export type UpdateEmployeeRoleSchema = z.infer<typeof updateEmployeeRoleSchema>;

export const updateUserProfileSchema = z.object({
  name: z.string(),
  username: z.string().optional().nullable(),
  phoneNo: z.string().optional().nullable(),
});
export type UpdateUserProfileSchema = z.infer<typeof updateUserProfileSchema>;
