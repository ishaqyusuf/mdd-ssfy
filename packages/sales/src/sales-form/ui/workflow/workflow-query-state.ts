type WorkflowQueryLike = {
	isError?: boolean;
	error?: unknown;
};

export type WorkflowPanelStatus = {
	tone: "error" | "empty";
	title: string;
	description: string;
};

export function workflowQueryHasError(query?: WorkflowQueryLike | null) {
	return Boolean(query?.isError || query?.error);
}

export function workflowQueryErrorMessage(query?: WorkflowQueryLike | null) {
	const error = query?.error;
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}
	if (typeof error === "string" && error.trim()) {
		return error;
	}
	return "Refresh and try again.";
}

export function resolveWorkflowRouteStatus(input: {
	routeQuery?: WorkflowQueryLike | null;
	rootComponentsQuery?: WorkflowQueryLike | null;
	routeReady: boolean;
	rootStepId?: number | string | null;
	rootComponentsCount: number;
	isLoading: boolean;
}): WorkflowPanelStatus | null {
	if (workflowQueryHasError(input.routeQuery) && !input.routeReady) {
		return {
			tone: "error",
			title: "Workflow route unavailable",
			description: workflowQueryErrorMessage(input.routeQuery),
		};
	}

	if (!input.isLoading && !input.rootStepId) {
		return {
			tone: "empty",
			title: "Root step unavailable",
			description: "The workflow route is missing its root step.",
		};
	}

	if (
		workflowQueryHasError(input.rootComponentsQuery) &&
		!input.rootComponentsCount
	) {
		return {
			tone: "error",
			title: "Root components unavailable",
			description: workflowQueryErrorMessage(input.rootComponentsQuery),
		};
	}

	return null;
}

export function resolveWorkflowStepComponentStatus(input: {
	stepQuery?: WorkflowQueryLike | null;
	stepTitle?: string | null;
	componentsCount: number;
}): WorkflowPanelStatus | null {
	if (!workflowQueryHasError(input.stepQuery) || input.componentsCount) {
		return null;
	}

	return {
		tone: "error",
		title: "Step components unavailable",
		description:
			workflowQueryErrorMessage(input.stepQuery) ||
			`Could not load ${input.stepTitle || "this step"}.`,
	};
}
