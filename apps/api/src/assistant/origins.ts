/** Resolve trusted deployment configuration, never client forwarding headers. */
export function getAssistantAllowedOrigins(env: {
	ALLOWED_API_ORIGINS?: string;
	NEXT_PUBLIC_APP_URL?: string;
	PORTLESS_URL?: string;
}) {
	const candidates = [
		...(env.ALLOWED_API_ORIGINS?.split(",") ?? []),
		env.NEXT_PUBLIC_APP_URL,
		env.PORTLESS_URL,
	];
	return [
		...new Set(
			candidates.flatMap((value) => {
				if (!value?.trim()) return [];
				try {
					const url = new URL(value.trim());
					return (url.protocol === "https:" || url.protocol === "http:") &&
						!url.username &&
						!url.password
						? [url.origin]
						: [];
				} catch {
					return [];
				}
			}),
		),
	];
}
