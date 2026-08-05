import { randomUUID } from "node:crypto";
import { dealershipAppRouter } from "@gnd/api/trpc/routers/dealership-app";
import { getDealerAuthSession } from "@gnd/auth/better-auth/dealership";
import { db } from "@gnd/db";
import { getActiveDealerByAuthUserId } from "@gnd/db/queries";
import { buildErrorReport } from "@gnd/observability";
import * as Sentry from "@sentry/nextjs";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

async function handler(request: Request) {
	const requestId = request.headers.get("x-request-id") || randomUUID();
	const response = await fetchRequestHandler({
		endpoint: "/api/trpc",
		req: request,
		router: dealershipAppRouter,
		onError({ error, path, type }) {
			const report = buildErrorReport(error, {
				operation: path,
				requestId,
				runtime: "dealership",
				source: "trpc",
				tags: { procedure_type: type },
			});
			if (report.classified.reportable) {
				Sentry.captureException(report.reportableError, report.captureContext);
			}
		},
		createContext: async () => {
			const session = await getDealerAuthSession(request.headers);
			const dealer = session?.user?.id
				? await getActiveDealerByAuthUserId(db, session.user.id)
				: null;

			return {
				db,
				dealer,
				dealerAuthUserId: session?.user?.id,
				requestId,
			};
		},
	});

	const headers = new Headers(response.headers);
	headers.set("x-request-id", requestId);
	return new Response(response.body, { headers, status: response.status });
}

export { handler as GET, handler as POST };

export const dynamic = "force-dynamic";
