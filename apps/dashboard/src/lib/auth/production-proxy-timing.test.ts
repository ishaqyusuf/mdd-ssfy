import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { observeProductionProxyAuth } from "./production-proxy-timing";

const diagnosticUrl = new URL("https://example.com/sales-book/productions?__productionTiming=1");
let log = spyOn(console, "info").mockImplementation(() => {});
afterEach(() => { log.mockRestore(); });

describe("temporary Production proxy auth observation", () => {
    it.each([
        "https://example.com/sales-book/productions",
        "https://example.com/sales-book/productions?__productionTiming=0",
        "https://example.com/sales-book/orders?__productionTiming=1",
    ])("leaves unflagged or unrelated requests silent: %s", async (url) => {
        log = spyOn(console, "info").mockImplementation(() => {});
        const auth = { user: { id: 42 } };
        let calls = 0;
        expect(await observeProductionProxyAuth(new URL(url), async () => { calls++; return auth; })).toBe(auth);
        expect(calls).toBe(1);
        expect(log).not.toHaveBeenCalled();
    });

    it("returns the unchanged auth object and logs only static phases/timings", async () => {
        log = spyOn(console, "info").mockImplementation(() => {});
        const auth = { sensitive: "must-not-be-logged" };
        expect(await observeProductionProxyAuth(diagnosticUrl, async () => auth)).toBe(auth);
        expect(log.mock.calls).toHaveLength(2);
        const events = log.mock.calls.map(([tag, payload]) => {
            expect(tag).toBe("[DEBUG-production-proxy-v1]");
            const event = JSON.parse(payload);
            expect(Object.keys(event).sort()).toEqual(["elapsedMs", "enteredAt", "phase"]);
            expect(Number.isFinite(event.enteredAt)).toBe(true);
            expect(event.elapsedMs).toBeGreaterThanOrEqual(0);
            return event.phase;
        });
        expect(events).toEqual(["auth_started", "auth_settled"]);
        expect(JSON.stringify(log.mock.calls)).not.toContain(auth.sensitive);
    });

    it("preserves the exact failure without logging its contents", async () => {
        log = spyOn(console, "info").mockImplementation(() => {});
        const failure = new Error("private-failure-detail");
        await expect(observeProductionProxyAuth(diagnosticUrl, async () => { throw failure; })).rejects.toBe(failure);
        expect(JSON.parse(log.mock.calls[1][1]).phase).toBe("auth_rejected");
        expect(JSON.stringify(log.mock.calls)).not.toContain(failure.message);
    });

    it("does not turn a logging failure into an auth failure", async () => {
        log = spyOn(console, "info").mockImplementation(() => { throw new Error("logger unavailable"); });
        expect(await observeProductionProxyAuth(diagnosticUrl, async () => null)).toBeNull();
    });
});
