import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");

function source(path: string) {
	return readFileSync(resolve(root, path), "utf8");
}

describe("sales PDF attachment policy", () => {
	it("does not gate sales PDF attachments by environment or payload opt-outs", () => {
		const attachmentSources = [
			".env.example",
			"packages/utils/src/envs.ts",
			"packages/notifications/src/types/simple-sales-document-email.ts",
			"packages/notifications/src/types/composed-sales-document-email.ts",
			"packages/notifications/src/schemas.ts",
			"packages/notifications/src/index.ts",
			"packages/jobs/src/tasks/sales/create-send-sales-email-task.ts",
			"apps/api/src/db/queries/sales-email-attempts.ts",
			"apps/api/src/db/queries/checkout.ts",
			"apps/www/src/components/sales-menu.tsx",
		];

		for (const path of attachmentSources) {
			const contents = source(path);
			expect(contents, path).not.toContain("ATTACH_SALES_EMAIL_PDF");
			expect(contents, path).not.toContain("shouldAttachSalesEmailPdf");
			expect(contents, path).not.toContain("skipPdfAttachment");
		}
	});

	it("allocates enough memory for production PDF rendering", () => {
		const notificationTask = source(
			"packages/jobs/src/tasks/notifications/notifications.ts",
		);

		expect(notificationTask).toContain('machine: "medium-1x"');
		expect(notificationTask).not.toContain('machine: "micro"');
	});
});
