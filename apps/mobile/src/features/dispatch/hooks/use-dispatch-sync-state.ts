import { useNetInfo } from "@react-native-community/netinfo";
import { useEffect, useMemo, useState } from "react";

export type DispatchSyncState =
	| "checking"
	| "offline"
	| "syncing"
	| "failed"
	| "synced";

function formatSyncAge(updatedAt: number, now: number) {
	if (!updatedAt) return "No successful sync yet";
	const seconds = Math.max(0, Math.floor((now - updatedAt) / 1_000));
	if (seconds < 10) return "Last synced just now";
	if (seconds < 60) return `Last synced ${seconds}s ago`;
	const minutes = Math.floor(seconds / 60);
	return `Last synced ${minutes}m ago`;
}

export function useDispatchSyncState(input: {
	dataUpdatedAt: number;
	isFetching: boolean;
	isError: boolean;
}) {
	const network = useNetInfo();
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 30_000);
		return () => clearInterval(timer);
	}, []);

	return useMemo(() => {
		const knownOffline =
			network.isConnected === false || network.isInternetReachable === false;
		const unknown =
			network.isConnected == null && network.isInternetReachable == null;
		const state: DispatchSyncState = knownOffline
			? "offline"
			: input.isFetching
				? "syncing"
				: input.isError
					? "failed"
					: unknown && !input.dataUpdatedAt
						? "checking"
						: "synced";
		return {
			state,
			lastSyncLabel: formatSyncAge(input.dataUpdatedAt, now),
		};
	}, [
		input.dataUpdatedAt,
		input.isError,
		input.isFetching,
		network.isConnected,
		network.isInternetReachable,
		now,
	]);
}
