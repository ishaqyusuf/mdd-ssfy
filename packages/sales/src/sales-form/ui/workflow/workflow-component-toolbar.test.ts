import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolveWorkflowToolbarMode } from "./workflow-component-toolbar";

describe("workflow component toolbar boundary", () => {
	it("floats above the editor actions and remains inside component pickers", () => {
		const toolbar = readFileSync(
			new URL("./workflow-component-toolbar.tsx", import.meta.url),
			"utf8",
		);
		const rootPicker = readFileSync(
			new URL("./root-component-picker.tsx", import.meta.url),
			"utf8",
		);
		const stepPicker = readFileSync(
			new URL("./step-component-picker.tsx", import.meta.url),
			"utf8",
		);

		expect(toolbar).toContain('position.mode === "fixed"');
		expect(toolbar).toContain("bottom: footerGap");
		expect(rootPicker).toContain('data-workflow-component-boundary="true"');
		expect(stepPicker).toContain('data-workflow-component-boundary="true"');
	});

	it("fixes, anchors, and hides according to the component boundary", () => {
		expect(
			resolveWorkflowToolbarMode({
				boundaryTop: 120,
				boundaryBottom: 1800,
				viewportTop: 70,
				viewportBottom: 900,
				footerGap: 56,
			}),
		).toBe("fixed");
		expect(
			resolveWorkflowToolbarMode({
				boundaryTop: 120,
				boundaryBottom: 820,
				viewportTop: 70,
				viewportBottom: 900,
				footerGap: 56,
			}),
		).toBe("anchored");
		expect(
			resolveWorkflowToolbarMode({
				boundaryTop: -900,
				boundaryBottom: -20,
				viewportTop: 70,
				viewportBottom: 900,
				footerGap: 56,
			}),
		).toBe("hidden");
	});
});
