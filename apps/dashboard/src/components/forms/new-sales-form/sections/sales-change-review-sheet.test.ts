import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const sheetSource = readFileSync(
	new URL("./sales-change-review-sheet.tsx", import.meta.url),
	"utf8",
);
const formSource = readFileSync(
	new URL("../new-sales-form.tsx", import.meta.url),
	"utf8",
);

describe("sales change review", () => {
	it("uses authenticated sales-representative approval without a customer link", () => {
		expect(sheetSource).toContain('"Approve"');
		expect(sheetSource).toContain("Committing changes…");
		expect(sheetSource).not.toContain("Create customer approval link");
		expect(sheetSource).not.toContain("Copy approval link");
		expect(sheetSource).not.toContain("Customer contact reference");
		expect(formSource).not.toContain("approvalUrl");
	});

	it("interrupts saving only for the focused sales-rep review boundary", () => {
		expect(formSource).toContain("requiresSalesRepApproval");
		expect(formSource).toContain("hasSalesRepApprovalChange");
		expect(formSource).toContain(
			"The approved changes are being committed automatically in the background.",
		);
	});
});
