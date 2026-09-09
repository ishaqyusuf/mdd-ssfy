import { createPrivateKey, sign } from "node:crypto";

/** Server-only; callers must never persist or log the returned credential. */
export function signGithubAppJwt(input: {
	clientId: string;
	privateKey: string;
	now: Date;
}) {
	if (
		!/^[A-Za-z0-9_.-]{1,160}$/.test(input.clientId) ||
		!Number.isFinite(input.now.getTime()) ||
		input.privateKey.length > 32_768
	)
		throw new Error("Invalid GitHub App signing configuration");
	try {
		const key = createPrivateKey(input.privateKey);
		if (
			key.asymmetricKeyType !== "rsa" ||
			(key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
		)
			throw new Error("Invalid signing key");
		const now = Math.floor(input.now.getTime() / 1000);
		const encode = (value: unknown) =>
			Buffer.from(JSON.stringify(value)).toString("base64url");
		const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: input.clientId, iat: now - 60, exp: now + 540 })}`;
		return `${unsigned}.${sign("RSA-SHA256", Buffer.from(unsigned), key).toString("base64url")}`;
	} catch {
		throw new Error("GitHub App signing unavailable");
	}
}
