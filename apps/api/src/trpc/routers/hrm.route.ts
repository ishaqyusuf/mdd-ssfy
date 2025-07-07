import { getEmployeeFormData, saveEmployee } from "@api/db/queries/hrm";
import { createTRPCRouter, publicProcedure } from "../init";
import { saveInboundNoteSchema } from "@api/schemas/notes";
import {
  employeeFormSchema,
  getEmployeeFormDataSchema,
} from "@api/schemas/hrm";

export const hrmRoutes = createTRPCRouter({
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
