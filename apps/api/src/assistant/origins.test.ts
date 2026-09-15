import { expect, test } from "bun:test";
import { getAssistantAllowedOrigins } from "./origins";

test("trusts the configured public dashboard behind the shared HTTPS proxy", () => {
	expect(getAssistantAllowedOrigins({
		NEXT_PUBLIC_APP_URL: "https://gndprodesk.localhost/",
		PORTLESS_URL: "https://gndprodesk.localhost",
		ALLOWED_API_ORIGINS: " https://dashboard.example,https://other.example:8443 ",
	})).toEqual([
		"https://dashboard.example",
		"https://other.example:8443",
		"https://gndprodesk.localhost",
	]);
});

test("does not infer wildcard or malformed trusted origins", () => {
	expect(getAssistantAllowedOrigins({
		ALLOWED_API_ORIGINS: "*,null,garbage,file:///tmp/test,https://user:pass@example.com",
	})).toEqual([]);
	expect(getAssistantAllowedOrigins({})).toEqual([]);
});
