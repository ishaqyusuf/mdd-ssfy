"use client";

export function ErrorFallback({ error }: { error: Error }) {
	return (
		<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
			{error.message || "Something went wrong."}
		</div>
	);
}
