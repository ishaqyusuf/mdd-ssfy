import { describe, expect, it } from "bun:test";

import { dueDateAlert } from "./utils";

describe("Production due-date presentation", () => {
	it("uses the oldest missed assignment as the controlling Past Due date", () => {
		const oldest = new Date("2024-05-01T12:00:00.000Z");
		const newer = new Date("2024-07-01T12:00:00.000Z");

		expect(dueDateAlert([newer, oldest]).date).toEqual(oldest);
	});
});
