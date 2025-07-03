import { z } from "zod";

export const employeeFormSchema = z.object({
  name: z.string(),
  email: z.string(),
  phoneNo: z.string().nullable().nullable(),
  username: z.string().nullable().nullable(),
});
export type EmployeeFormSchema = z.infer<typeof employeeFormSchema>;

export const updateEmployeeRoleSchema = z.object({
  roleId: z.number(),
  userId: z.number(),
});
export type UpdateEmployeeRoleSchema = z.infer<typeof updateEmployeeRoleSchema>;
