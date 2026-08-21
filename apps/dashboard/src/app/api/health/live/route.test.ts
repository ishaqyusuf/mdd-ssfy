import { describe, expect, it } from "bun:test";
import { GET } from "./route";

describe("dashboard liveness route", () => {
	it("answers a public liveness probe without a response body", async () => {
		const response = await GET();

		expect(response.status).toBe(204);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(await response.text()).toBe("");
	});
});
