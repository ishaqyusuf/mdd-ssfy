/** @jsxImportSource react */

import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { getInvoiceItemMoveTargets } from "./invoice-item-card";
import {
	WorkflowLineList,
	resolveNewlyAddedActiveLineUid,
} from "./workflow-line-list";

describe("WorkflowLineList", () => {
	it("targets only the newly added active item for scrolling", () => {
		expect(
			resolveNewlyAddedActiveLineUid(
				["line-1", "line-2"],
				["line-1", "line-2", "line-3"],
				"line-3",
			),
		).toBe("line-3");
		expect(
			resolveNewlyAddedActiveLineUid(
				["line-1", "line-2"],
				["line-1", "line-2", "line-3"],
				"line-2",
			),
		).toBeNull();
	});

	it("builds numbered move targets and disables the current position", () => {
		expect(getInvoiceItemMoveTargets(1, 3)).toEqual([
			{ index: 0, label: "Item 1", disabled: false },
			{ index: 1, label: "Item 2", disabled: true },
			{ index: 2, label: "Item 3", disabled: false },
		]);
	});

	it("scopes each rendered panel to its own active-line state", () => {
		const html = renderToStaticMarkup(
			<WorkflowLineList
				items={[
					{
						index: 0,
						line: {
							uid: "line-1",
							title: "First line",
							formSteps: [
								{ step: { title: "Door" }, stepId: 51 },
								{
									step: { title: "House Package Tool" },
									stepId: 52,
								},
							],
						},
					},
					{
						index: 1,
						line: {
							uid: "line-2",
							title: "Second line",
							formSteps: [{ step: { title: "Height" }, stepId: 52 }],
						},
					},
				]}
				activeLineUid="line-2"
				activeStepByLine={{ "line-1": 0, "line-2": 0 }}
				resolveActiveStepIndex={(_steps, index) => index}
				getLineTitlePlaceholder={() => null}
				getLineDisplayTotal={() => 0}
				onActivateLine={() => undefined}
				onTitleChange={() => undefined}
				onRemoveLine={() => undefined}
				onDuplicateLine={() => undefined}
				onMoveLine={() => undefined}
				onAddLine={() => undefined}
				onStepChange={() => undefined}
				renderPanel={(line, _steps, _activeIndex, activeStep, isActive) => (
					<div
						data-line={String(line.uid)}
						data-active={String(isActive)}
						data-step={activeStep?.step?.title}
					/>
				)}
				isRedirectDisabledStep={() => false}
				stepKey={(lineUid, stepIndex) => `${lineUid}-${stepIndex}`}
				componentLabel={(value) => value || ""}
			/>,
		);

		expect(html).toContain('data-line="line-1" data-active="false"');
		expect(html).toContain('data-step="House Package Tool"');
		expect(html).toContain('data-line="line-2" data-active="true"');
		expect(html).toContain('value="First line"');
		expect(html).toContain("text-sm uppercase");
		expect(html).toContain("md:col-span-10 md:pr-3");
		expect(html).toContain(
			"block overflow-hidden text-ellipsis whitespace-nowrap uppercase",
		);
		expect(html).toContain(
			"border-primary-foreground/50 bg-primary text-primary-foreground shadow-sm",
		);
		expect(html).toContain('id="sales-form-item-line-2"');
		expect(html).toContain('aria-label="Item 1 actions"');
		expect(html).toContain('aria-label="Item 2 actions"');
		expect(html).toContain("transition-[grid-template-rows,opacity,transform]");
		expect(html).toContain("motion-reduce:transition-none");
		expect(html).toContain("w-full gap-2 uppercase");
		expect(html).toContain("Add New Line");
		expect(html).toContain('data-version="v1"');
	});

	it("renders the V2 steps as a slash-separated value hierarchy", () => {
		const html = renderToStaticMarkup(
			<WorkflowLineList
				items={[
					{
						index: 0,
						line: {
							uid: "line-1",
							title: "Garage door",
							formSteps: [
								{ value: "Garage Door", step: { title: "Item Type" } },
								{ value: "SC Molded", step: { title: "Style" } },
								{ value: "8-0", step: { title: "Height" } },
								{
									value: "House Package Tool",
									step: { title: "Package Tool" },
								},
							],
						},
					},
				]}
				activeLineUid="line-1"
				activeStepByLine={{ "line-1": 3 }}
				stepListVersion="v2"
				resolveActiveStepIndex={(_steps, index) => index}
				getLineTitlePlaceholder={() => null}
				getLineDisplayTotal={() => 0}
				onActivateLine={() => undefined}
				onTitleChange={() => undefined}
				onRemoveLine={() => undefined}
				onStepChange={() => undefined}
				renderPanel={() => <div>Active step panel</div>}
				isRedirectDisabledStep={() => false}
				stepKey={(lineUid, stepIndex) => `${lineUid}-${stepIndex}`}
				componentLabel={(value) => value || ""}
			/>,
		);

		expect(html).toContain('data-version="v2"');
		expect(html).toContain('aria-label="Item configuration steps"');
		expect(html).toContain(">Garage Door</button>");
		expect(html).toContain(">SC Molded</button>");
		expect(html).toContain(">8-0</button>");
		expect(html).toContain(">House Package Tool</button>");
		expect(html.match(/aria-hidden="true"/g)?.length).toBe(3);
		expect(html).toContain(
			'aria-current="step" aria-label="Open House Package Tool"',
		);
		expect(html).toContain("bg-primary/10 px-2 font-bold text-primary");
		expect(html).toContain('class="px-2 text-xs');
		expect(html).toContain("text-xs whitespace-nowrap uppercase");
		expect(html).not.toContain("-mx-4 mt-3 min-h-[43px]");
		expect(html).toContain("flex flex-wrap items-center");
		expect(html).toContain("flex shrink-0 items-center");
		expect(html).not.toContain("overflow-x-auto");
		expect(html).not.toContain("min-w-max");
	});
});
