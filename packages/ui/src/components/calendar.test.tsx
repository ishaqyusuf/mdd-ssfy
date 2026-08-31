import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { Calendar } from "./calendar";

describe("shared calendar grid alignment", () => {
	test("keeps the shadcn proportional grid and valid cell-size utilities", () => {
		const markup = renderToStaticMarkup(
			<Calendar
				mode="single"
				defaultMonth={new Date(2026, 7, 1)}
				onSelect={() => undefined}
			/>,
		);

		expect(markup).toContain("w-full border-collapse");
		expect(markup).toContain("flex-1");
		expect(markup).toContain("aspect-square h-full w-full");
		expect(markup).toContain("min-w-(--cell-size)");
		expect(markup).not.toContain("size-[--cell-size]");
	});

	test("distinguishes today from the selected date", () => {
		const markup = renderToStaticMarkup(
			<Calendar
				mode="single"
				defaultMonth={new Date(2026, 7, 1)}
				today={new Date(2026, 7, 15)}
				selected={new Date(2026, 7, 20)}
				onSelect={() => undefined}
			/>,
		);

		expect(markup).toContain("rdp-day bg-accent/50 rounded-full rdp-today");
		expect(markup).toContain('data-selected-single="true"');
		expect(markup).toContain('data-today="true"');
	});
});
