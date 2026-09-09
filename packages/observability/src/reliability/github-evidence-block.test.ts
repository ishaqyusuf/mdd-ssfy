import { expect, it } from "bun:test";
import { updateGithubEvidenceBlock } from "./github-evidence-block";

it("creates stable markers and preserves human text when updating evidence", () => {
	const input = {
		incidentId: "incident_123",
		evidence: "First observation",
		existingBody: null,
	};
	const created = updateGithubEvidenceBlock(input);
	const existingBody = `Human introduction\n\n${created}\n\nHuman investigation and checklist`;
	const updated = updateGithubEvidenceBlock({
		...input,
		evidence: "New observation",
		existingBody,
	});
	expect(updated).toBe(
		"Human introduction\n\n<!-- reliability:incident_123:start -->\nNew observation\n<!-- reliability:incident_123:end -->\n\nHuman investigation and checklist",
	);
	expect(
		updateGithubEvidenceBlock({
			...input,
			evidence: "New observation",
			existingBody: updated,
		}),
	).toBe(updated);
});

it("refuses removed, duplicated, reversed, or injected ownership markers", () => {
	const input = {
		incidentId: "incident_123",
		evidence: "Evidence",
		existingBody: null,
	};
	const block = updateGithubEvidenceBlock(input);
	for (const existingBody of [
		"Human-only body",
		block + block,
		"<!-- reliability:incident_123:end -->\n<!-- reliability:incident_123:start -->",
		block.replace("Evidence", "<!-- reliability:other:start -->"),
	]) {
		expect(() =>
			updateGithubEvidenceBlock({ ...input, existingBody }),
		).toThrow();
	}
	expect(() =>
		updateGithubEvidenceBlock({
			...input,
			evidence: "<!-- reliability:incident_123:end -->",
		}),
	).toThrow();
	expect(() =>
		updateGithubEvidenceBlock({ ...input, incidentId: "bad --> marker" }),
	).toThrow();
});
