export type LoginDeviceInfo = {
	key: string;
	label: string;
	browser: string;
	os: string;
	deviceClass: "desktop" | "mobile" | "tablet" | "unknown";
};

export type LoginSessionLike = {
	id?: string | null;
	userAgent?: string | null;
};

const UNKNOWN_DEVICE_KEY = "unknown-device";

function normalizeToken(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export function normalizeLoginDevice(
	userAgent?: string | null,
): LoginDeviceInfo {
	const raw = userAgent?.trim();
	if (!raw) {
		return {
			key: UNKNOWN_DEVICE_KEY,
			label: "Unknown device",
			browser: "Unknown browser",
			os: "Unknown OS",
			deviceClass: "unknown",
		};
	}

	const ua = raw.toLowerCase();
	const browser = ua.includes("edg/")
		? "Microsoft Edge"
		: ua.includes("opr/") || ua.includes("opera")
			? "Opera"
			: ua.includes("samsungbrowser")
				? "Samsung Internet"
				: ua.includes("firefox/") || ua.includes("fxios/")
					? "Firefox"
					: ua.includes("crios/") || ua.includes("chrome/")
						? "Chrome"
						: ua.includes("safari/")
							? "Safari"
							: "Unknown browser";

	const os = ua.includes("android")
		? "Android"
		: ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")
			? "iOS"
			: ua.includes("windows")
				? "Windows"
				: ua.includes("mac os x") || ua.includes("macintosh")
					? "macOS"
					: ua.includes("cros")
						? "Chrome OS"
						: ua.includes("linux")
							? "Linux"
							: "Unknown OS";

	const deviceClass =
		ua.includes("ipad") || ua.includes("tablet")
			? "tablet"
			: ua.includes("mobi") || ua.includes("iphone") || ua.includes("android")
				? "mobile"
				: "desktop";

	return {
		key: [browser, os, deviceClass].map(normalizeToken).join(":"),
		label: `${browser} on ${os} (${deviceClass})`,
		browser,
		os,
		deviceClass,
	};
}

export function hasSeenLoginDevice(
	userAgent: string | null | undefined,
	sessions: LoginSessionLike[],
	options: { excludeSessionId?: string | null } = {},
) {
	const currentDevice = normalizeLoginDevice(userAgent);

	return sessions.some((session) => {
		if (options.excludeSessionId && session.id === options.excludeSessionId) {
			return false;
		}

		return normalizeLoginDevice(session.userAgent).key === currentDevice.key;
	});
}

export function isNewLoginDevice(
	userAgent: string | null | undefined,
	sessions: LoginSessionLike[],
	options: { excludeSessionId?: string | null } = {},
) {
	return !hasSeenLoginDevice(userAgent, sessions, options);
}
