import { describe, expect, it } from "bun:test";
import {
	resolveWorkflowRouteStatus,
	resolveWorkflowStepComponentStatus,
	workflowQueryErrorMessage,
	workflowQueryHasError,
} from "./workflow-query-state";

describe("workflow query state", () => {
	it("treats explicit query errors and error objects as failures", () => {
		expect(workflowQueryHasError({ isError: true })).toBe(true);
		expect(workflowQueryHasError({ error: new Error("Route failed") })).toBe(
			true,
		);
		expect(workflowQueryHasError({})).toBe(false);
		expect(
			workflowQueryErrorMessage({ error: new Error("Route failed") }),
		).toBe("Route failed");
	});

	it("surfaces missing route and root component states", () => {
		expect(
			resolveWorkflowRouteStatus({
				routeQuery: { isError: true, error: "No route" },
				rootComponentsQuery: {},
				routeReady: false,
				rootStepId: null,
				rootComponentsCount: 0,
				isLoading: false,
			})?.title,
		).toBe("Workflow route unavailable");

		expect(
			resolveWorkflowRouteStatus({
				routeQuery: {},
				rootComponentsQuery: {},
				routeReady: true,
				rootStepId: null,
				rootComponentsCount: 0,
				isLoading: false,
			})?.title,
		).toBe("Root step unavailable");

		expect(
			resolveWorkflowRouteStatus({
				routeQuery: {},
				rootComponentsQuery: { error: "Root failed" },
				routeReady: true,
				rootStepId: 1,
				rootComponentsCount: 0,
				isLoading: false,
			})?.title,
		).toBe("Root components unavailable");
	});

	it("keeps stale component data visible while reporting hard empty failures", () => {
		expect(
			resolveWorkflowStepComponentStatus({
				stepQuery: { isError: true },
				stepTitle: "Door",
				componentsCount: 2,
			}),
		).toBeNull();

		expect(
			resolveWorkflowStepComponentStatus({
				stepQuery: { isError: true, error: "Step failed" },
				stepTitle: "Door",
				componentsCount: 0,
			})?.description,
		).toBe("Step failed");
	});
});
