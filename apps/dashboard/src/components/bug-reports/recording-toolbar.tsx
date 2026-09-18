"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useEffect, useState } from "react";
import { formatBugReportDuration } from "./status";

type RecordingToolbarProps = {
	startedAt: number;
	maxDurationMs: number;
	onCancel: () => void;
	onFinish: () => void;
};

export function RecordingToolbar({
	startedAt,
	maxDurationMs,
	onCancel,
	onFinish,
}: RecordingToolbarProps) {
	const [elapsedMs, setElapsedMs] = useState(() =>
		Math.max(0, Date.now() - startedAt),
	);

	useEffect(() => {
		const update = () =>
			setElapsedMs(
				Math.min(maxDurationMs, Math.max(0, Date.now() - startedAt)),
			);
		update();
		const timer = window.setInterval(update, 250);
		return () => window.clearInterval(timer);
	}, [maxDurationMs, startedAt]);

	return (
		<output
			data-bug-report-ignore="true"
			className="fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background/95 px-3 py-2 shadow-xl backdrop-blur"
			aria-label="Bug report recording controls"
		>
			<span className="flex items-center gap-2 px-1 text-sm font-medium">
				<span className="size-2 animate-pulse rounded-full bg-destructive" />
				Recording {formatBugReportDuration(elapsedMs)}
			</span>
			<Button type="button" size="sm" variant="outline" onClick={onCancel}>
				<Icons.X className="mr-1 size-4" />
				Cancel
			</Button>
			<Button type="button" size="sm" onClick={onFinish}>
				<Icons.StopCircle className="mr-1 size-4" />
				Finish
			</Button>
		</output>
	);
}
