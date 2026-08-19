/** @jsxImportSource react */

import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StepComponentPicker } from "./step-component-picker";

function renderPicker(input: { loading: boolean; hasComponents: boolean }) {
	return renderToStaticMarkup(
		<StepComponentPicker
			loading={input.loading}
			hasComponents={input.hasComponents}
			filteredComponents={[]}
			search=""
			toolbarSlot={<div data-testid="toolbar">Search and actions</div>}
			getKey={() => "component"}
			renderComponent={() => null}
		/>,
	);
}

describe("StepComponentPicker", () => {
	it("keeps the floating toolbar mounted during loading and empty states", () => {
		for (const state of [
			{ loading: true, hasComponents: false },
			{ loading: false, hasComponents: false },
		]) {
			const html = renderPicker(state);
			expect(html).toContain('data-workflow-component-boundary="true"');
			expect(html).toContain('data-testid="toolbar"');
		}
	});
});
