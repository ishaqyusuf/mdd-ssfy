"use client";

import { SalesSettingsRouteError } from "@/components/settings/sales-settings-route-error";

export default function SalesOperationsSettingsError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<SalesSettingsRouteError
			title="Unable to load Sales Operations settings"
			error={error}
			reset={reset}
		/>
	);
}
