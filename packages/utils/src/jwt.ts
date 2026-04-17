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
	return jwt.sign(data, getSecret(), { expiresIn: "1h" });
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
