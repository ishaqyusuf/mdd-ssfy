import { analyticsBatchSchema } from "@ishaqyusuf/logly-core";
import { nativeAnalyticsBatchSchema } from "./native-contract";
import { isProductOrigin, safeBatch } from "./policy";
import { readBatchBody } from "./read-batch-body";

export function createEventsRoute(
	surface: "web" | "mobile" = "web",
	productOriginOverride?: string,
	projectOverride?: string,
) {
	return async function POST(request: Request) {
		const collector = process.env.LOGLY_COLLECTOR_URL?.trim();
		const projectKey =
			surface === "mobile"
				? process.env.LOGLY_MOBILE_PROJECT_KEY?.trim()
				: process.env.LOGLY_PROJECT_KEY?.trim();
		if (!collector || !projectKey) {
			return Response.json(
				{ error: "Analytics is not configured" },
				{ status: 503 },
			);
		}
		const productOrigin =
			productOriginOverride ||
			process.env.GND_LOGLY_ORIGIN?.trim() ||
			process.env.NEXT_PUBLIC_APP_URL?.trim() ||
			"https://www.gndprodesk.com";
		const origin = request.headers.get("origin");
		if (
			surface === "web"
				? !origin ||
					!isProductOrigin(
						origin,
						productOrigin,
						process.env.NODE_ENV !== "production",
					)
				: Boolean(origin)
		) {
			return Response.json({ error: "Origin not allowed" }, { status: 403 });
		}
		const input = await readBatchBody(request);
		if (input.ok === false) {
			return Response.json(
				{ error: input.status === 413 ? "Batch too large" : "Invalid batch" },
				{
					status: input.status,
					headers: { "x-gnd-analytics-stage": "body" },
				},
			);
		}
		const parsed =
			surface === "mobile"
				? nativeAnalyticsBatchSchema.safeParse(input.body)
				: analyticsBatchSchema.safeParse(input.body);
		if (!parsed.success) {
			return Response.json(
				{ error: "Invalid batch" },
				{ status: 400, headers: { "x-gnd-analytics-stage": "schema" } },
			);
		}
		const project =
			projectOverride ??
			(surface === "mobile"
				? (process.env.LOGLY_MOBILE_PROJECT?.trim() ?? "gnd-mobile")
				: (process.env.NEXT_PUBLIC_LOGLY_PROJECT?.trim() ?? "gnd-web"));
		const batch = safeBatch(parsed.data, project, surface);
		if (!batch.events.length) {
			return Response.json({ accepted: 0 }, { status: 202 });
		}
		const country =
			process.env.VERCEL === "1"
				? request.headers.get("x-vercel-ip-country")
				: null;
		try {
			const response = await fetch(
				`${collector.replace(/\/$/, "")}/v1/events`,
				{
					method: "POST",
					headers: {
						"content-type": "application/json",
						"x-logly-project-key": projectKey,
						"x-logly-origin": new URL(productOrigin).origin,
						...(country && /^[A-Z]{2}$/.test(country)
							? { "x-logly-country": country }
							: {}),
					},
					body: JSON.stringify(batch),
					signal: AbortSignal.timeout(4_000),
				},
			);
			return new Response(response.body, {
				status: response.status,
				headers: { "content-type": "application/json" },
			});
		} catch {
			return Response.json({ error: "Analytics unavailable" }, { status: 502 });
		}
	};
}

export const POST = createEventsRoute();
