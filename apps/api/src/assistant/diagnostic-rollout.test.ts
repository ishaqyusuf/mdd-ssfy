import { expect, test } from "bun:test";
import { assistantRouter } from "../trpc/routers/assistant.route";
import { captureAssistantDiagnostic } from "./diagnostics";

test("diagnostic UI rollout stays within Super Admin authority and leaves capture running", async () => {
	const previous = process.env.ASSISTANT_DIAGNOSTICS_UI_ROLLOUT;
	let role = "Super Admin";
	const caller = assistantRouter.createCaller({ userId: 42, db: {
		users: { findFirst: async () => ({ roles: [{ role: { name: role } }] }) },
	} as never });
	try {
		delete process.env.ASSISTANT_DIAGNOSTICS_UI_ROLLOUT;
		expect(await caller.diagnosticAccess()).toEqual({ allowed: true, uiEnabled: true });
		for (const mode of ["off", "all", "invalid"]) {
			process.env.ASSISTANT_DIAGNOSTICS_UI_ROLLOUT = mode;
			expect(await caller.diagnosticAccess()).toEqual({ allowed: true, uiEnabled: false });
		}
		process.env.ASSISTANT_DIAGNOSTICS_UI_ROLLOUT = "super-admin";
		role = "Employee";
		expect(await caller.diagnosticAccess()).toEqual({ allowed: false, uiEnabled: false });
		await expect(caller.diagnostic({ reference: "ERR-ABCDEFGHIJ" })).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(caller.captureHealth()).rejects.toMatchObject({ code: "FORBIDDEN" });
		process.env.ASSISTANT_DIAGNOSTICS_UI_ROLLOUT = "off";
		let stored = 0;
		let monitored = 0;
		const result = await captureAssistantDiagnostic(new Error("private fault"), { stage: "provider", operation: "qa.rollout" }, {
			health: async () => {},
			store: async () => { stored++; },
			monitor: () => { monitored++; return "a".repeat(32); },
		});
		expect(result.recorded).toBe(true);
		expect(stored).toBe(1);
		expect(monitored).toBe(1);
	} finally {
		if (previous === undefined) delete process.env.ASSISTANT_DIAGNOSTICS_UI_ROLLOUT;
		else process.env.ASSISTANT_DIAGNOSTICS_UI_ROLLOUT = previous;
	}
});
