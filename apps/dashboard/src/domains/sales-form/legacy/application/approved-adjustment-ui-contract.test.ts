import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const salesFormSource = readFileSync(
	new URL(
		"../../../../components/forms/sales-form/sales-form.tsx",
		import.meta.url,
	),
	"utf8",
);
const sidebarSource = readFileSync(
	new URL(
		"../../../../components/forms/sales-form/sales-form-sidebar.tsx",
		import.meta.url,
	),
	"utf8",
);
const saveSource = readFileSync(
	new URL(
		"../../../../components/forms/sales-form/sales-form-save.tsx",
		import.meta.url,
	),
	"utf8",
);

describe("approved adjustment legacy UI contract", () => {
	it("passes read-only authority through item, sidebar, and save surfaces", () => {
		expect(salesFormSource).toContain(
			"<SalesFormActionToolbar onPreview={preview} readOnly={readOnly}",
		);
		expect(salesFormSource).toContain("readOnly={readOnly}");
		expect(salesFormSource).toContain("inert={readOnly ? true : undefined}");
		expect(sidebarSource).toContain("inert={readOnly ? true : undefined}");
		expect((salesFormSource.match(/disabled=\{readOnly\}/g) || []).length).toBe(
			2,
		);
	});

	it("disables every manual save variant and guards direct invocation", () => {
		expect(
			(saveSource.match(/disabled=\{disabled \|\| isSaving\}/g) || []).length,
		).toBe(10);
		expect(saveSource).toContain(
			"if (disabled || saveLockRef.current || isSaving) return;",
		);
		expect(saveSource).toContain('chooseSaveOption("default")');
		expect(saveSource).toContain('chooseSaveOption("close")');
		expect(saveSource).toContain('chooseSaveOption("new")');
	});
});
