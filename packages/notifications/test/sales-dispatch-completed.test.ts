import { expect, test } from "bun:test";
import { notificationJobSchema, salesDispatchCompletedSchema } from "../src/schemas";
import { salesDispatchCompleted } from "../src/types/sales-dispatch-completed";

test("queued completion preserves external-only delivery after durable inbox creation", () => {
	const event = notificationJobSchema.parse({
		channel: "sales_dispatch_completed",
		author: { id: 1, role: "employee" },
		skipActivities: true,
		payload: { dispatchId: 9, completedByAdmin: true },
	});
	expect(event.skipActivities).toBe(true);
	expect(event.payload).toMatchObject({ completedByAdmin: true });
});

test("admin completion is explicit in the driver's activity and message", () => {
	const payload = salesDispatchCompletedSchema.parse({ dispatchId: 9, orderNo: "09602", completedByAdmin: true });
	const activity = salesDispatchCompleted.createActivity(payload, { id: 1 } as never, {} as never);
	expect(activity.headline).toContain("completed by an administrator");
	expect(activity.tags).toMatchObject({ completedByAdmin: true });
	expect(salesDispatchCompleted.createWhatsApp?.(payload, {} as never, {} as never)).toMatchObject({ message: expect.stringContaining("completed by an administrator") });
});

test("ordinary delivery completion retains its existing description", () => {
	const activity = salesDispatchCompleted.createActivity({ dispatchId: 9, orderNo: "09602" }, { id: 1 } as never, {} as never);
	expect(activity.headline).toBe("Dispatch 9 for order 09602 has been completed.");
});
