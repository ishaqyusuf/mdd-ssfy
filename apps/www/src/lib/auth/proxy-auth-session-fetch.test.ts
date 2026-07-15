import { describe, expect, it } from "bun:test";
import {
    fetchAuthSession,
    isTransientAuthSessionFetchError,
} from "./proxy-auth-session-fetch";

describe("proxy auth session fetch", () => {
    it("retries one transient socket close", async () => {
        const calls: string[] = [];
        const response = Response.json({ user: { id: 1 } });
        const fetchImpl = async () => {
            calls.push("fetch");

            if (calls.length === 1) {
                throw new TypeError("fetch failed", {
                    cause: Object.assign(new Error("other side closed"), {
                        code: "UND_ERR_SOCKET",
                    }),
                });
            }

            return response;
        };

        await expect(
            fetchAuthSession(
                new URL("http://127.0.0.1:3010/api/auth-session"),
                { method: "GET" },
                { fetchImpl, retryDelayMs: 0 },
            ),
        ).resolves.toBe(response);
        expect(calls).toHaveLength(2);
    });

    it("does not retry non-transient errors", async () => {
        const calls: string[] = [];
        const failure = new Error("bad url");
        const fetchImpl = async () => {
            calls.push("fetch");
            throw failure;
        };

        await expect(
            fetchAuthSession(
                new URL("https://app.example.com/api/auth-session"),
                { method: "GET" },
                { fetchImpl, retryDelayMs: 0 },
            ),
        ).rejects.toBe(failure);
        expect(calls).toHaveLength(1);
    });

    it("recognizes nested socket error causes", () => {
        expect(
            isTransientAuthSessionFetchError(
                new TypeError("fetch failed", {
                    cause: Object.assign(new Error("socket closed"), {
                        code: "UND_ERR_SOCKET",
                    }),
                }),
            ),
        ).toBe(true);
    });
});
