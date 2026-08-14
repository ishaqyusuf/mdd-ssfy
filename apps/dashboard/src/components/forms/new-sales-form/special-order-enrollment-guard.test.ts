import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolveSpecialOrderSaveInterruption } from "./special-order-save-interruption";

function readSource(path: string) {
	return readFileSync(new URL(path, import.meta.url), "utf8");
}

const formSource = readSource("./new-sales-form.tsx");
const summarySource = readSource("./sections/invoice-overview-panel.tsx");
const overviewSource = readSource(
	"../../sheets/sales-overview-sheet/general-tab.tsx",
);
const columnsSource = readSource("../../tables-2/sales-orders/columns.tsx");

describe("Special Order enrollment pilot guard", () => {
	test("gates only new enrollment while preserving existing order repair", () => {
		expect(
			resolveSpecialOrderSaveInterruption({
				type: "order",
				intent: "close",
				declaration: null,
				hasCustomerEmail: false,
				enrollmentAccess: { status: "ready", canEnroll: false },
			}),
		).toBe("CONTINUE");
		expect(
			resolveSpecialOrderSaveInterruption({
				type: "order",
				intent: "close",
				declaration: "YES",
				hasCustomerEmail: false,
				enrollmentAccess: { status: "ready", canEnroll: false },
			}),
		).toBe("CUSTOMER_EMAIL_REQUIRED");
		expect(
			resolveSpecialOrderSaveInterruption({
				type: "order",
				intent: "close",
				declaration: "YES",
				hasCustomerEmail: true,
				enrollmentAccess: { status: "ready", canEnroll: false },
			}),
		).toBe("CONTINUE");

		expect(formSource).toContain("specialOrder.enrollmentAccess");
		expect(formSource).toContain(
			"canEnrollSpecialOrder={canEnrollSpecialOrder}",
		);
		expect(summarySource).toContain(
			"showDeclarationControl={props.canEnrollSpecialOrder}",
		);
		expect(summarySource).toContain("<SpecialOrderDeclarationControl");
	});

	test("waits for authoritative access before requiring an unanswered declaration", () => {
		const base = {
			type: "order" as const,
			intent: "final" as const,
			declaration: null,
			hasCustomerEmail: true,
		};
		expect(
			resolveSpecialOrderSaveInterruption({
				...base,
				enrollmentAccess: { status: "pending" },
			}),
		).toBe("ENROLLMENT_ACCESS_PENDING");
		expect(
			resolveSpecialOrderSaveInterruption({
				...base,
				enrollmentAccess: { status: "error" },
			}),
		).toBe("ENROLLMENT_ACCESS_ERROR");
		expect(
			resolveSpecialOrderSaveInterruption({
				...base,
				enrollmentAccess: { status: "ready", canEnroll: true },
			}),
		).toBe("DECLARATION_REQUIRED");
	});

	test("keeps the order column and Sales Overview card available", () => {
		expect(columnsSource).toContain("specialOrderColumn");
		expect(columnsSource).toContain('header: "Special Order"');
		expect(overviewSource).toContain("<SpecialOrderOverviewCard />");
	});
});
