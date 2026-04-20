import jwt from "jsonwebtoken";
const SECRET = process.env.ENC_SECRET_KEY?.trim() || null;

function getSecret() {
	if (!SECRET) {
		throw new Error("ENC_SECRET_KEY is not configured");
	}

	return SECRET;
}

export function hasJwtSecret() {
	return Boolean(SECRET);
}

export function jwtEncrypt(data) {
	const expiry =
		data &&
		typeof data === "object" &&
		"expiry" in data &&
		typeof data.expiry === "string"
			? new Date(data.expiry)
			: null;
	const expiresInSeconds =
		expiry && !Number.isNaN(expiry.getTime())
			? Math.max(1, Math.floor((expiry.getTime() - Date.now()) / 1000))
			: undefined;

	return expiresInSeconds
		? jwt.sign(data, getSecret(), { expiresIn: expiresInSeconds })
		: jwt.sign(data, getSecret());
}

export function jwtDecrypt(token) {
	if (!SECRET) {
		return null;
	}

	try {
		return jwt.verify(token, SECRET);
	} catch {
		return null;
	}
}
