import { describe, expect, it } from "bun:test";
import { getAuthSessionUrl, isLocalDevHost } from "./proxy-auth-session-url";

function request(url: string, headers: Record<string, string> = {}) {
    const requestHeaders = new Headers(headers);

    return {
        url,
        headers: requestHeaders,
    };
}

describe("proxy auth session url", () => {
    it("uses the IPv4 app port for local http requests", () => {
        expect(
            getAuthSessionUrl(request("http://localhost:3000/sales"), {
                PORTLESS_APP_PORT: "3000",
            }).toString(),
        ).toBe("http://127.0.0.1:3000/api/auth-session");
    });

    it("uses the forwarded app port for local portless requests", () => {
        expect(
            getAuthSessionUrl(
                request("https://gndprodesk.localhost/sales", {
                    "x-forwarded-host": "gndprodesk.localhost",
                }),
                { PORTLESS_APP_PORT: "3000" },
            ).toString(),
        ).toBe("http://127.0.0.1:3000/api/auth-session");
    });

    it("preserves non-local origins", () => {
        expect(
            getAuthSessionUrl(
                request("https://app.example.com/sales"),
                {},
            ).toString(),
        ).toBe("https://app.example.com/api/auth-session");
    });

    it("recognizes IPv6 localhost with and without brackets", () => {
        expect(isLocalDevHost("::1")).toBe(true);
        expect(isLocalDevHost("[::1]:3000")).toBe(true);
    });
});
