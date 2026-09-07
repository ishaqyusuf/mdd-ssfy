/** @jsxImportSource react */
import type { ReactNode } from "react";
import { Button } from "@gnd/ui/button";

export function PlanningQueryState({ pending, failed, retry, children }: {
	pending: boolean;
	failed: boolean;
	retry: () => void;
	children: ReactNode;
}) {
	if (pending) return <p role="status">Loading planning gaps…</p>;
	if (failed) return (
		<div role="alert">
			<p>Planning gaps could not be loaded.</p>
			<Button variant="outline" onClick={retry}>Retry</Button>
		</div>
	);
	return <>{children}</>;
}
