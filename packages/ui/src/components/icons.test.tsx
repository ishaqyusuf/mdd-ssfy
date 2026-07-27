import { describe, expect, it } from "bun:test";
import { Cross2Icon } from "@radix-ui/react-icons";

import { Icons } from "./icons";

describe("Icons", () => {
	it("uses the close glyph for X", () => {
		expect(Icons.X).toBe(Cross2Icon);
	});
});
