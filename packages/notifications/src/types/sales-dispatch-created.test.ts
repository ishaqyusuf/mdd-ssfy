// @ts-expect-error package typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import { salesDispatchCreated } from "./sales-dispatch-created";

const author = {
	id: 1,
	profileId: 1,
	name: "System",
};

const recipient = {
	id: 2,
	profileId: 2,
	name: "Sales Manager",
	email: "sales@example.com",
};

describe("salesDispatchCreated", () => {
	test("uses created semantics independently from driver assignment", () => {
		const payload = {
			orderNo: "09406DB",
			dispatchId: 4515,
			deliveryMode: "delivery" as const,
		};

		const activity = salesDispatchCreated.createActivity(
			payload,
			author,
			recipient,
		);
		const email = salesDispatchCreated.createEmail?.(
			payload,
			author,
			recipient,
		);

		expect(activity.type).toBe("sales_dispatch_created");
		expect(activity.subject).toBe("Dispatch created");
		expect(email?.template).toBe("sales-dispatch-created");
		expect(email?.subject).toBe("New Dispatch Created: Order 09406DB");
		expect(email?.data).toMatchObject({
			orderNo: "09406DB",
			dispatchId: 4515,
			deliveryMode: "delivery",
		});
	});
});
