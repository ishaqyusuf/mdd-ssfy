import {
	addBugReportFollowUp,
	createBugReport,
	getAllBugReports,
	getBugReportById,
	getMyBugReports,
	transcribeBugReportFollowUp,
	updateBugReportStatus,
} from "@api/db/queries/bug-reports";
import {
	addBugReportFollowUpSchema,
	bugReportIdSchema,
	createBugReportSchema,
	listBugReportsSchema,
	transcribeBugReportFollowUpSchema,
	updateBugReportStatusSchema,
} from "@api/schemas/bug-reports";
import { createTRPCRouter, protectedProcedure } from "../init";

export const bugReportsRouter = createTRPCRouter({
	create: protectedProcedure.input(createBugReportSchema).mutation((props) => {
		return createBugReport(props.ctx, props.input);
	}),
	mine: protectedProcedure.query((props) => {
		return getMyBugReports(props.ctx);
	}),
	adminList: protectedProcedure.input(listBugReportsSchema).query((props) => {
		return getAllBugReports(props.ctx, props.input);
	}),
	byId: protectedProcedure.input(bugReportIdSchema).query((props) => {
		return getBugReportById(props.ctx, props.input.id);
	}),
	addFollowUp: protectedProcedure
		.input(addBugReportFollowUpSchema)
		.mutation((props) => {
			return addBugReportFollowUp(props.ctx, props.input);
		}),
	transcribeFollowUp: protectedProcedure
		.input(transcribeBugReportFollowUpSchema)
		.mutation((props) => {
			return transcribeBugReportFollowUp(props.ctx, props.input);
		}),
	updateStatus: protectedProcedure
		.input(updateBugReportStatusSchema)
		.mutation((props) => {
			return updateBugReportStatus(props.ctx, props.input);
		}),
});
