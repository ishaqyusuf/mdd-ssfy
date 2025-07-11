import {
  getEmployeeFormData,
  getEmployees,
  saveEmployee,
} from "@api/db/queries/hrm";
import { createTRPCRouter, publicProcedure } from "../init";
import {
  employeeFormSchema,
  employeesQueryParamsSchema,
  getEmployeeFormDataSchema,
} from "@api/schemas/hrm";

export const hrmRoutes = createTRPCRouter({
  getEmployees: publicProcedure
    .input(employeesQueryParamsSchema)
    .query(async (props) => {
      return getEmployees(props.ctx, props.input);
    }),
  saveEmployee: publicProcedure
    .input(employeeFormSchema)
    .mutation(async (props) => {
      return saveEmployee(props.ctx, props.input);
    }),
  getEmployeeForm: publicProcedure
    .input(getEmployeeFormDataSchema)
    .query(async (props) => {
      return getEmployeeFormData(props.ctx, props.input);
    }),
});
