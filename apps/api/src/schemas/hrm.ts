import { z } from "zod";

export const employeeFormSchema = z.object({
  id: z.number().nullable().optional(),
  name: z.string(),
  email: z.string(),
  roleId: z.number().optional().nullable(),
  profileId: z.number().optional().nullable(),
  phoneNo: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  password: z.string().nullable().optional().default("Millwork"),
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
