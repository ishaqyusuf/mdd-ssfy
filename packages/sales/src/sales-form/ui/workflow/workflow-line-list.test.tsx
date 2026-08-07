/** @jsxImportSource react */

import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkflowLineList } from "./workflow-line-list";

describe("WorkflowLineList", () => {
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
		expect(html).toContain("transition-[grid-template-rows,opacity,transform]");
		expect(html).toContain("motion-reduce:transition-none");
	});
});
