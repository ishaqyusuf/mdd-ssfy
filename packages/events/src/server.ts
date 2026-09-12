import { createServerAnalytics } from "@ishaqyusuf/logly-server";
import { waitUntil } from "@vercel/functions";
type TrackProperties = Record<string, unknown>;

export const setupAnalytics = async () => {
	const collectorUrl = process.env.LOGLY_COLLECTOR_URL;
	const serverKey = process.env.LOGLY_SERVER_KEY;
	const client =
		collectorUrl && serverKey
			? createServerAnalytics({
					collectorUrl,
					serverKey,
					project: process.env.LOGLY_SERVER_PROJECT ?? "gnd-web",
				})
			: null;

	return {
		track: (options: { event: string } & TrackProperties) => {
			if (process.env.NODE_ENV !== "production" || !client) return;
			const { event, ...rest } = options;
			waitUntil(client.track(event, rest));
		},
	};
};
