"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function ErrorPage({
	error,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6">
			<ErrorFallback error={error} />
		</div>
	);
}
