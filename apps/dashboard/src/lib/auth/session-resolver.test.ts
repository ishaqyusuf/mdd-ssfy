import { describe, expect, test } from "bun:test";

import { createServerAuthSessionResolver } from "./session-resolver";

describe("server auth session resolution", () => {
	test("deduplicates zero-argument reads while explicit headers bypass the request cache", async () => {
		const requestHeaders = new Headers({ cookie: "request=session" });
		const explicitHeaders = new Headers({ cookie: "explicit=session" });
		const loadedCookies: string[] = [];

		const resolveSession = createServerAuthSessionResolver({
			cache: (load) => {
				let result: ReturnType<typeof load> | undefined;
				return () => {
					if (!result) result = load();
					return result;
				};
			},
			getRequestHeaders: async () => requestHeaders,
			loadSession: async (headers) => {
				const cookie = new Headers(headers as Headers).get("cookie") ?? "";
				loadedCookies.push(cookie);
				return { cookie };
			},
		});

		const first = resolveSession();
		const second = resolveSession();

		expect(first).toBe(second);
		expect(await first).toEqual({ cookie: "request=session" });
		expect(await resolveSession(explicitHeaders)).toEqual({
			cookie: "explicit=session",
		});
		expect(loadedCookies).toEqual(["request=session", "explicit=session"]);
	});
});
