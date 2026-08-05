import { describe, expect, it } from "bun:test";
import { Cross2Icon } from "@radix-ui/react-icons";
import { renderToStaticMarkup } from "react-dom/server";

import { Icons } from "./icons";

describe("Icons", () => {
	it("uses the close glyph for X", () => {
		expect(Icons.X).toBe(Cross2Icon);
	});

	it("uses the columns glyph for table column selectors", () => {
		const columnsMarkup = renderToStaticMarkup(<Icons.ColumnsIcon />);
		const tuneMarkup = renderToStaticMarkup(<Icons.Tune />);
		const searchMarkup = renderToStaticMarkup(<Icons.Search />);

		expect(columnsMarkup).toBe(tuneMarkup);
		expect(columnsMarkup).not.toBe(searchMarkup);
	});
});
