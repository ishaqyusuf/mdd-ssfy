import { describe, expect, it } from "bun:test";
import { getSalesPrintStageToast } from "./sales-print-stage";

describe("getSalesPrintStageToast", () => {
	it("returns success copy for print dialog stage", () => {
		expect(getSalesPrintStageToast("print-dialog-called")).toEqual({
			title: "Print dialog opened",
			description: "Choose a printer to finish printing.",
		});
	});

	it("returns actionable timeout copy", () => {
		expect(
			getSalesPrintStageToast("print-timeout", {
				message: "Still waiting for the frame.",
			}),
		).toEqual({
			title: "Print viewer needs attention",
			description: "Still waiting for the frame.",
		});
	});

	it("uses error messages for failed print stages", () => {
		expect(
			getSalesPrintStageToast("print-data-query-error", {
				error: new Error("PDF failed"),
			}),
		).toEqual({
			title: "Unable to prepare print",
			description: "PDF failed",
		});
	});
});
