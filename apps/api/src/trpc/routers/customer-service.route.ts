import {
	assignWorkOrder,
	assignWorkOrderSchema,
	deleteWorkOrder,
	deleteWorkOrderSchema,
	getCustomerServiceCalendar,
	getCustomerServiceCalendarSchema,
	getCustomerServiceSummary,
	getCustomerServices,
	getCustomerServicesSchema,
	getWorkOrderAssignees,
	getWorkorderChartFilter,
	updateWorkOrderStatus,
	updateWorkOrderStatusSchema,
} from "@api/db/queries/customer-service";
import { createTRPCRouter, publicProcedure } from "../init";

export const customerServiceRouter = createTRPCRouter({
	getAssignees: publicProcedure.query(({ ctx }) => getWorkOrderAssignees(ctx)),
	getSummary: publicProcedure.query(({ ctx }) =>
		getCustomerServiceSummary(ctx),
	),
	getCalendar: publicProcedure
		.input(getCustomerServiceCalendarSchema)
		.query(({ ctx, input }) => getCustomerServiceCalendar(ctx, input)),
	getChart: publicProcedure.query(({ ctx }) =>
		getWorkorderChartFilter(ctx, {}),
	),
	assignWorkOrder: publicProcedure
		.input(assignWorkOrderSchema)
		.mutation(async (props) => {
			return assignWorkOrder(props.ctx, props.input);
		}),
	getCustomerServices: publicProcedure
		.input(getCustomerServicesSchema)
		.query(async ({ ctx, input }) => {
			return await getCustomerServices(ctx, input);
		}),
	deleteWorkOrder: publicProcedure
		.input(deleteWorkOrderSchema)
		.mutation(async (props) => {
			return deleteWorkOrder(props.ctx, props.input);
		}),
	updateWorkOrderStatus: publicProcedure
		.input(updateWorkOrderStatusSchema)
		.mutation(async (props) => {
			return updateWorkOrderStatus(props.ctx, props.input);
		}),
});
