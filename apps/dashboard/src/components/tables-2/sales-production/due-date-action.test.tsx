/** @jsxImportSource react */
import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

let canEdit = true;
let writes = 0;
mock.module("@/actions/batch-edit-production-orders", () => ({
	batchEditProductionOrdersAction: () => undefined,
}));
mock.module("@/hooks/use-auth", () => ({
	useAuth: () => ({ can: { editProduction: canEdit } }),
}));
mock.module("@/trpc/client", () => ({ useTRPC: () => ({}) }));
mock.module("@gnd/ui/tanstack", () => ({ useQueryClient: () => ({}) }));
mock.module("next-safe-action/hooks", () => ({
	useAction: () => ({
		executeAsync: () => {
			writes++;
		},
	}),
}));
mock.module("@/lib/query-events", () => ({
	publishQueryEvent: () => undefined,
}));
const { ProductionDueDateAction } = await import("./due-date-action");

const render = (dueDate: string | null, completed = false) =>
	renderToStaticMarkup(
		<ProductionDueDateAction
			salesId={42}
			orderNo="TEST-42"
			dueDate={dueDate}
			completed={completed}
		/>,
	);

test("only overdue unfinished production offers the row calendar action", () => {
	canEdit = true;
	expect(render("2000-01-01")).toContain(
		'aria-label="Change due date for TEST-42"',
	);
	for (const date of [null, "invalid", "2999-01-01"])
		expect(render(date)).toBe("");
	expect(render("2000-01-01", true)).toBe("");
	expect(writes).toBe(0);
});

test("read-only users cannot open an overdue date editor", () => {
	canEdit = false;
	expect(render("2000-01-01")).toBe("");
	expect(writes).toBe(0);
});
