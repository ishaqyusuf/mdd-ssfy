"use client";

import { ErrorFallback } from "@/components/error-fallback";
import { Button } from "@gnd/ui/button";

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center gap-4 px-6">
			<ErrorFallback error={error} />
			<Button onClick={reset} variant="outline">
				Try again
			</Button>
		</div>
	);
}
