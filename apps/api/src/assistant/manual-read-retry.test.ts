import { expect, test } from "bun:test";
import { createAssistantReadRetry, executeAssistantReadRetry } from "./manual-read-retry";
import type { executeRegisteredAssistantTool } from "./registry";

const actor = { userId: 42, scopeType: "organization", scopeId: "7", grants: { viewOrders: true } };
const request = { conversationId: "chat", runId: "run", toolCallId: "call", toolId: "sales_get_order_status", version: 1, input: { orderNo: "QA-42" } };
function harness() {
	const values = new Map<string, string>();
	const calls: unknown[] = [];
	let now = 1000;
	const command = async <T>(parts: (string | number)[]) => {
		const key = String(parts[0] === "EVAL" ? parts[3] : parts[1]);
		if (parts[0] === "SET") {
			if (values.has(key)) return null as T;
			values.set(key, String(parts[2]));
			expect(parts.slice(3)).toEqual(["EX", 600, "NX"]);
			return "OK" as T;
		}
		if (parts[0] === "GET") return (values.get(key) ?? null) as T;
		if (parts[0] === "EVAL" && values.get(key) === parts[4]) { values.delete(key); return 1 as T; }
		return 0 as T;
	};
	const execute = (async (_actor, input) => { calls.push(input); return { status: "success", data: {} }; }) as typeof executeRegisteredAssistantTool;
	return { values, calls, deps: { command, execute, now: () => now }, expire: () => { now += 600_001; } };
}

test("a retry executes only its original read once, including concurrent redemption", async () => {
	const h = harness();
	const persisted: unknown[] = [];
	const id = await createAssistantReadRetry(actor, request, h.deps);
	expect(id).toBeString();
	const results = await Promise.allSettled([0, 1].map(() => executeAssistantReadRetry(actor, id!, { signal: new AbortController().signal, authorize: async ticket => { expect(ticket).toMatchObject({ conversationId: "chat", runId: "run", toolCallId: "call" }); return true; }, persist: async retry => { persisted.push(retry); return { message: "saved" }; } }, h.deps)));
	expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
	expect(h.calls).toEqual([{ toolId: "sales_get_order_status", version: 1, input: { orderNo: "QA-42" } }]);
	expect(persisted).toHaveLength(1);
});

test("execution or persistence failure leaves the ticket available", async () => {
	const h = harness();
	const id = await createAssistantReadRetry(actor, request, h.deps);
	await expect(executeAssistantReadRetry(actor, id!, {
		signal: new AbortController().signal,
		authorize: async () => true,
		persist: async () => { throw new Error("database unavailable"); },
	}, h.deps)).rejects.toThrow("database unavailable");
	expect(h.values.has(`assistant:manual-read-retry:${id}`)).toBe(true);
});

test("scope changes, permission loss, refreshed revocation, stale history, expiry and cancellation stop execution", async () => {
	for (const scenario of ["scope", "permission", "refresh", "history", "expired", "cancelled"] as const) {
		const h = harness();
		const id = await createAssistantReadRetry(actor, request, h.deps);
		const controller = new AbortController();
		if (scenario === "expired") h.expire();
		if (scenario === "cancelled") controller.abort();
		const current = scenario === "scope" ? { ...actor, scopeId: "other" } : scenario === "permission" ? { ...actor, grants: {} } : actor;
		await expect(executeAssistantReadRetry(current, id!, {
			signal: controller.signal,
			authorize: async () => scenario !== "history",
			...(scenario === "refresh"
				? { resolveActor: async () => ({ ...actor, grants: {} }) }
				: {}),
		}, h.deps)).rejects.toBeInstanceOf(Error);
		expect(h.calls).toHaveLength(0);
	}
});

test("writes, invalid input and unavailable storage never issue a handle", async () => {
	const h = harness();
	expect(await createAssistantReadRetry(actor, { ...request, toolId: "sales_create_order" }, h.deps)).toBeNull();
	expect(await createAssistantReadRetry(actor, { ...request, input: { password: "private" } }, h.deps)).toBeNull();
	expect(await createAssistantReadRetry(actor, request, { ...h.deps, command: async () => { throw new Error("unavailable"); } })).toBeNull();
	expect(h.values.size).toBe(0);
});
