import { describe, expect, it } from "bun:test";

const source = await Bun.file(
	new URL("./dispatch.route.ts", import.meta.url),
).text();

describe("direct dispatch task actor boundary", () => {
	it("normalizes cancellation, start, and submit inputs before task execution", () => {
		expect(source).toContain("function withAuthenticatedSalesControlActor(");
		expect(source).toContain("userId: actor.id");
		expect(source).toContain("name: actor.name");
		expect(source).toContain("cancelDispatchTask(transactionDb, input");
		expect(source).toContain("startDispatchTask(transactionDb, input");
		expect(source).toContain("submitDispatchTask(transactionDb, input)");
		expect(source).toContain("runCanonicalDispatchCommand(");
	});

	it("revalidates every batch trip start through the canonical guarded helper", () => {
		expect(source).toContain("startReadyRoute: protectedProcedure");
		expect(source).toContain("await requireDispatchWorker(props.ctx)");
		expect(source).toContain("assignedOnly: true");
		expect(source).toContain("executeDriverTripStart(props.ctx, actor");
		expect(source).toContain(
			"projection.mobileLifecycle.capabilities.canStartTrip",
		);
	});
});
