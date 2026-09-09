import { expect, it } from "bun:test";
import { resolveGithubReliabilityRegistration } from "./github-registration";
const entry = {
	serviceId: "web",
	repository: "gnd/fixture",
	repositoryId: 1,
	installationId: 2,
	actorId: 3,
	clientId: "Iv1.fixture",
	privateKeyEnv: "RELIABILITY_GITHUB_APP_KEY_WEB",
};
it("resolves only the registered service and separate key reference", () => {
	const env = {
		RELIABILITY_GITHUB_REGISTRATIONS: JSON.stringify([entry]),
		RELIABILITY_GITHUB_APP_KEY_WEB: "fixture-key",
	};
	expect(resolveGithubReliabilityRegistration("missing", env)).toBeNull();
	expect(resolveGithubReliabilityRegistration("web", {})).toBeNull();
	expect(resolveGithubReliabilityRegistration("web", env)?.repositoryId).toBe(
		1,
	);
	expect(resolveGithubReliabilityRegistration("web", env)?.privateKey).toBe(
		"fixture-key",
	);
});
it("rejects ambiguous or invalid configuration without disclosing credentials", () => {
	for (const entries of [
		[entry, entry],
		[{ ...entry, repository: "gnd/.." }],
		[{ ...entry, privateKeyEnv: "UNRELATED_SECRET" }],
		[{ ...entry, repositoryId: 0 }],
		[{ ...entry, privateKey: "embedded-secret" }],
	]) {
		expect(() =>
			resolveGithubReliabilityRegistration("web", {
				RELIABILITY_GITHUB_REGISTRATIONS: JSON.stringify(entries),
			}),
		).toThrow("Invalid GitHub reliability registration");
	}
	expect(() =>
		resolveGithubReliabilityRegistration("web", {
			RELIABILITY_GITHUB_REGISTRATIONS: JSON.stringify([entry]),
		}),
	).toThrow("Invalid GitHub reliability registration");
});
