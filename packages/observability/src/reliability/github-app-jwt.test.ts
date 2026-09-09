import { expect, it } from "bun:test";
import { generateKeyPairSync, verify } from "node:crypto";
import { signGithubAppJwt } from "./github-app-jwt";
it("signs a bounded RS256 app credential with clock-skew allowance", () => {
	const { privateKey, publicKey } = generateKeyPairSync("rsa", {
		modulusLength: 2048,
	});
	const now = new Date("2026-09-09T12:00:00Z");
	const token = signGithubAppJwt({
		clientId: "Iv1.fixture",
		privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
		now,
	});
	const [header = "", payload = "", signature = ""] = token.split(".");
	expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({
		alg: "RS256",
		typ: "JWT",
	});
	expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toEqual({
		iss: "Iv1.fixture",
		iat: now.getTime() / 1000 - 60,
		exp: now.getTime() / 1000 + 540,
	});
	expect(
		verify(
			"RSA-SHA256",
			Buffer.from(`${header}.${payload}`),
			publicKey,
			Buffer.from(signature, "base64url"),
		),
	).toBe(true);
});
it("rejects invalid keys without disclosing their contents", () => {
	expect(() =>
		signGithubAppJwt({
			clientId: "Iv1.fixture",
			privateKey: "private-invalid-key",
			now: new Date(),
		}),
	).toThrow("GitHub App signing unavailable");
	const { privateKey } = generateKeyPairSync("ec", {
		namedCurve: "prime256v1",
	});
	expect(() =>
		signGithubAppJwt({
			clientId: "Iv1.fixture",
			privateKey: privateKey
				.export({ type: "pkcs8", format: "pem" })
				.toString(),
			now: new Date(),
		}),
	).toThrow("GitHub App signing unavailable");
});
