/** @jsxImportSource react */
import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanningCard, type PlanningItem } from "./planning-calendar-card";

function item(): PlanningItem {
	return {
		kind: "planning",
		id: "planning:1",
		orderId: 1,
		orderNo: "09502PC",
		slug: "order-slug-42",
		customer: "Example customer",
		dueDate: "2026-09-07",
		dateProvenance: "Order production due date",
		due: { bucket: "today", label: "Today" },
		priority: "NORMAL",
		reason: "partially_assigned",
		label: "Partially assigned",
		requiredQty: 5,
		assignedQty: 2,
		uncoveredQty: 3,
		assignmentCount: 1,
		canAssign: true,
		assignmentLockReasons: [],
		reviewMessage: null,
		workers: ["Example worker"],
		production: {
			applicability: "required",
			state: "partially_assigned",
			requiredQty: 5,
			assignedQty: 2,
			completedQty: 0,
			assignmentIds: [1],
		},
		presentation: {
			tone: "unassigned",
			label: "Partially assigned",
			statusOnly: false,
		},
		productionLabel: "Partially assigned",
		headline: {
			code: "production_queued",
			label: "Production queued",
			tone: "amber",
		},
		material: {
			applicability: "unknown",
			state: "unknown",
			requiredQty: 0,
			readyQty: 0,
		},
		completion: null,
		provenance: [],
		expectedEvidenceRevision: "test-revision",
	};
}

describe("Production planning card rendering", () => {
	it("does not claim material readiness when applicability is unknown", () => {
		const row = item();
		row.material.state = "ready";
		const unknown = renderToStaticMarkup(<PlanningCard item={row} onOpen={() => {}} canEditDueDate={false} />);
		assert.ok(unknown.includes("Readiness unavailable"));
		assert.ok(!unknown.includes("<strong>ready</strong>"));
		row.material.applicability = "required";
		const known = renderToStaticMarkup(<PlanningCard item={row} onOpen={() => {}} canEditDueDate={false} />);
		assert.ok(known.includes("<strong>ready</strong>"));
		assert.ok(!known.includes("Readiness unavailable"));
	});
	it("shows zero-assignment demand as Not assigned with the full uncovered quantity", () => {
		const row = item();
		row.reason = "not_assigned";
		row.label = "Not assigned";
		row.presentation.label = "Not assigned";
		row.assignedQty = 0;
		row.uncoveredQty = 5;
		row.assignmentCount = 0;
		row.workers = [];
		const html = renderToStaticMarkup(<PlanningCard item={row} onOpen={() => {}} canEditDueDate={false} />);
		assert.equal(html.match(/Not assigned/g)?.length, 1);
		assert.ok(html.includes("Assigned <strong>0</strong>"));
		assert.ok(html.includes("Uncovered <strong>5</strong>"));
		assert.ok(!html.includes("Example worker"));
	});
	it("renders required order, date, coverage, worker, priority and material information", () => {
		const html = renderToStaticMarkup(
			<PlanningCard item={item()} onOpen={() => {}} canEditDueDate />,
		);
		for (const text of [
			"09502PC",
			"Example customer",
			"Order production due date",
			"2026-09-07",
			"Today",
			"Required",
			"Assigned",
			"Uncovered",
			"Example worker",
			"Normal",
			"Readiness unavailable",
			"Production queued",
		]) {
			assert.ok(html.includes(text));
		}
		assert.ok(html.includes("Assign Production"));
		assert.ok(html.includes('href="/sales-book/edit-order/order-slug-42"'));
		assert.equal(html.match(/Partially assigned/g)?.length, 1);
		assert.ok(!html.includes("draggable"));
		assert.ok(!html.includes("Reschedule"));
	});
	it("keeps review cards read-only and shows the actual review explanation", () => {
		const row = item();
		row.canAssign = false;
		row.reason = "needs_review";
		row.label = "Needs review";
		row.reviewMessage = "Production requirements have not been established.";
		row.presentation = {
			tone: "unknown",
			label: "Status unavailable",
			statusOnly: false,
		};
		const html = renderToStaticMarkup(
			<PlanningCard item={row} onOpen={() => {}} canEditDueDate={false} />,
		);
		assert.ok(html.includes(row.reviewMessage));
		assert.ok(html.includes("Needs review"));
		assert.ok(html.includes("Status unavailable"));
		assert.ok(!html.includes("Assign Production"));
		assert.ok(!html.includes("Edit order due date"));
	});
	it("keeps past-due emphasis separate from primary color and escapes customer text", () => {
		const row = item();
		row.customer = "<script>bad()</script>";
		row.due = { bucket: "past-due", label: "Yesterday" };
		const html = renderToStaticMarkup(
			<PlanningCard item={row} onOpen={() => {}} canEditDueDate={false} />,
		);
		assert.ok(html.includes("bg-amber-100"));
		assert.ok(html.includes("ring-rose-500"));
		assert.ok(html.includes("&lt;script&gt;"));
		assert.ok(!html.includes("<script>"));
	});
	it("renders critical priority with a solid red surface and the status border", () => {
		const row = item();
		row.priority = "CRITICAL";
		const html = renderToStaticMarkup(
			<PlanningCard item={row} onOpen={() => {}} canEditDueDate />,
		);
		assert.ok(html.includes("bg-red-700/90"));
		assert.ok(html.includes("text-white"));
		assert.ok(html.includes("border-amber-300"));
		assert.ok(html.includes("border-2"));
		assert.ok(html.includes("Priority: Critical"));
	});
});
