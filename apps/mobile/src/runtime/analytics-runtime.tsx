import { createNativeAnalytics } from "@gnd/events/native";
import * as Application from "expo-application";
import { randomUUID } from "expo-crypto";
import { useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

const storageKey = (key: string) => key.replaceAll(":", ".");

export function AnalyticsRuntime() {
	const segments = useSegments();
	const route = `/${segments
		.filter((segment) => !segment.startsWith("(") && !segment.startsWith("["))
		.join("/")}`;
	const latestRoute = useRef(route);
	latestRoute.current = route;
	const client = useRef<ReturnType<typeof createNativeAnalytics> | null>(null);

	useEffect(() => {
		if (process.env.EXPO_PUBLIC_LOGLY_ENABLED !== "true") return;
		const endpoint = process.env.EXPO_PUBLIC_LOGLY_ENDPOINT;
		if (
			!endpoint ||
			(process.env.NODE_ENV === "production" &&
				!endpoint.startsWith("https://"))
		) {
			return;
		}
		if (Platform.OS !== "android" && Platform.OS !== "ios") return;

		const analytics = createNativeAnalytics({
			project: process.env.EXPO_PUBLIC_LOGLY_PROJECT ?? "gnd-mobile",
			endpoint,
			platform: Platform.OS,
			appVersion: Application.nativeApplicationVersion ?? undefined,
			appBuild: Application.nativeBuildVersion ?? undefined,
			createId: randomUUID,
			storage: {
				getItem: (key) => SecureStore.getItemAsync(storageKey(key)),
				setItem: (key, value) =>
					SecureStore.setItemAsync(storageKey(key), value),
				removeItem: (key) => SecureStore.deleteItemAsync(storageKey(key)),
			},
		});
		client.current = analytics;
		void analytics
			.init()
			.then(() => analytics.trackScreenView(latestRoute.current));
		const listener = AppState.addEventListener("change", (state) => {
			if (state === "active") void analytics.trackSession(latestRoute.current);
			if (state === "background") void analytics.flush();
		});
		return () => {
			listener.remove();
			void analytics.destroy();
			client.current = null;
		};
	}, []);

	useEffect(() => {
		void client.current?.trackScreenView(route);
	}, [route]);

	return null;
}
