export const SALES_PRODUCTION_WORKSPACE_TABS = [
	"queue",
	"reviews",
	"completed",
] as const;

export const SALES_PRODUCTION_WORKSPACE_TAB_PARAMS = [
	...SALES_PRODUCTION_WORKSPACE_TABS,
	"calendar",
] as const;

export const SALES_PRODUCTION_WORKSPACE_VIEWS = ["table", "calendar"] as const;

export type SalesProductionWorkspaceTab =
	(typeof SALES_PRODUCTION_WORKSPACE_TABS)[number];

export const SALES_PRODUCTION_QUEUE_STATES = [
	"all",
	"unassigned",
	"ready",
	"in-progress",
	"blocked",
	"awaiting-review",
] as const;

export const SALES_PRODUCTION_DUE_FILTERS = [
	"overdue",
	"today",
	"tomorrow",
	"unscheduled",
] as const;

export const SALES_PRODUCTION_MATERIAL_FILTERS = [
	"available",
	"review",
	"blocked",
	"unavailable",
] as const;

export const SALES_PRODUCTION_SORTS = [
	"priority",
	"due-asc",
	"due-desc",
	"newest",
	"oldest",
] as const;

type WorkspaceInput = {
	tab?: string | null;
	view?: string | null;
	queue?: string | null;
	due?: string | null;
	date?: string | null;
	material?: string | null;
	sort?: string | null;
	label?: string | null;
	q?: string | null;
	assignedToId?: number | null;
	"customer.name"?: string | null;
	phone?: string | null;
	po?: string | null;
	item?: string | null;
	"sales.rep"?: string | null;
	invoice?: string | null;
	dateRange?: string[] | null;
	"production.dueDate"?: string[] | null;
	priority?: string | null;
	production?: string | null;
	productionDueDate?: string | null;
	productionSort?: string | null;
	salesNo?: string | null;
	show?: string | null;
	"production.assignment"?: string | null;
	cursor?: string | number | null;
	size?: number | null;
};

type ProductionListInput = Record<string, string | number | string[]>;

const SORT_MAP: Record<string, string> = {
	priority: "priority",
	"due-asc": "dueDateAsc",
	"due-desc": "dueDateDesc",
	newest: "newest",
	oldest: "oldest",
};

const DUE_MAP: Record<string, string> = {
	overdue: "past-due",
	today: "due-today",
	tomorrow: "due-tomorrow",
	unscheduled: "unscheduled",
};

const LEGACY_LABEL_DUE_MAP: Record<string, string> = {
	"past-due": "past-due",
	"due-today": "due-today",
	"due-tomorrow": "due-tomorrow",
};

export function resolveSalesProductionWorkspaceQuery(input: WorkspaceInput) {
	const tab = resolveTab(input);
	const view = tab === "queue" ? resolveView(input) : "table";
	const list: ProductionListInput = {};

	copyString(list, "q", input.q);
	copyNumber(list, "assignedToId", input.assignedToId);
	copyString(list, "customer.name", input["customer.name"]);
	copyString(list, "phone", input.phone);
	copyString(list, "po", input.po);
	copyString(list, "item", input.item);
	copyString(list, "sales.rep", input["sales.rep"]);
	copyString(list, "invoice", input.invoice);
	copyArray(list, "dateRange", input.dateRange);
	copyArray(list, "production.dueDate", input["production.dueDate"]);
	copyString(list, "priority", input.priority);
	copyString(list, "salesNo", input.salesNo);
	copyNumber(list, "size", input.size);
	if (input.cursor != null && input.cursor !== "") list.cursor = input.cursor;

	if (tab === "completed") {
		list.production = "completed";
		copyString(list, "material", input.material);
		copyString(
			list,
			"productionSort",
			SORT_MAP[input.sort || ""] || input.productionSort,
		);
		return { tab, view, list };
	}

	list.production =
		input.production === "in progress" ? "in progress" : "pending";

	if (input.queue === "unassigned") {
		list["production.assignment"] = "not assigned";
	} else if (input.queue === "ready") {
		list["production.assignment"] = "all assigned";
		if (!input.material) list.material = "available";
	} else if (input.queue === "in-progress") {
		list.production = "in progress";
	} else if (input.queue === "blocked" && !input.material) {
		list.material = "blocked";
	}

	const exactDate = input.date || input.productionDueDate;
	if (exactDate) {
		list.productionDueDate = exactDate;
	} else {
		const show =
			DUE_MAP[input.due || ""] ||
			LEGACY_LABEL_DUE_MAP[input.label || ""] ||
			input.show;
		if (show) list.show = show;
	}

	copyString(list, "material", input.material);
	const productionSort = SORT_MAP[input.sort || ""] || input.productionSort;
	copyString(list, "productionSort", productionSort);

	return { tab, view, list };
}

function resolveTab(input: WorkspaceInput): SalesProductionWorkspaceTab {
	if (
		SALES_PRODUCTION_WORKSPACE_TABS.includes(
			input.tab as SalesProductionWorkspaceTab,
		)
	) {
		return input.tab as SalesProductionWorkspaceTab;
	}
	if (input.queue === "awaiting-review" || input.label === "material-review") {
		return "reviews";
	}
	if (input.production === "completed" || input.label === "completed") {
		return "completed";
	}
	return "queue";
}

function resolveView(input: WorkspaceInput) {
	if (
		SALES_PRODUCTION_WORKSPACE_VIEWS.includes(
			input.view as (typeof SALES_PRODUCTION_WORKSPACE_VIEWS)[number],
		)
	) {
		return input.view as (typeof SALES_PRODUCTION_WORKSPACE_VIEWS)[number];
	}
	if (input.tab === "calendar" || input.date || input.productionDueDate) {
		return "calendar";
	}
	return "table";
}

function copyString(
	target: ProductionListInput,
	key: string,
	value: string | null | undefined,
) {
	if (value) target[key] = value;
}

function copyNumber(
	target: ProductionListInput,
	key: string,
	value: number | null | undefined,
) {
	if (value != null) target[key] = value;
}

function copyArray(
	target: ProductionListInput,
	key: string,
	value: string[] | null | undefined,
) {
	if (value?.length) target[key] = value;
}
