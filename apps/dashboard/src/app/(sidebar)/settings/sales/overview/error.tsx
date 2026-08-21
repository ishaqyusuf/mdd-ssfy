"use client";

import { SalesSettingsRouteError } from "@/components/settings/sales-settings-route-error";

export default function SalesOverviewSettingsError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<SalesSettingsRouteError
			title="Unable to load Sales Overview settings"
			error={error}
			reset={reset}
		/>
	);
}
