import { describe, expect, test } from "bun:test";
import {
	assistantArtifactDialogAttributes,
	syncAssistantArtifactDialogMode,
} from "./assistant-artifact-canvas";

describe("assistant artifact canvas presentation", () => {
	test("switches between adjacent desktop and modal compact dialog modes", () => {
		const calls: string[] = [];
		const dialog = {
			open: true,
			close: () => calls.push("close"),
			show: () => calls.push("show"),
			showModal: () => calls.push("showModal"),
		};

		syncAssistantArtifactDialogMode(dialog, true);
		expect(calls).toEqual(["close", "showModal"]);
		expect(assistantArtifactDialogAttributes(true)).toEqual({
			"aria-modal": true,
		});

		calls.length = 0;
		syncAssistantArtifactDialogMode({ ...dialog, open: false }, false);
		expect(calls).toEqual(["show"]);
		expect(assistantArtifactDialogAttributes(false)).toEqual({
			"aria-modal": false,
		});
	});
});
