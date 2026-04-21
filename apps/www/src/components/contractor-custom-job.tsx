"use client";

import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";

export function ContractorCustomJob({ className }: { className?: string }) {
	if (process.env.NODE_ENV === "production") return null;

	const auth = useAuth();
	const trpc = useTRPC();
	const { data: jobSettings } = useQuery(trpc.settings.getJobSettings.queryOptions());

	const isActive = Boolean(
		jobSettings?.meta?.allowCustomJobs || auth.can?.submitCustomJob,
	);

	return (
		<div
			className={cn(
				"print:hidden flex h-6 items-center justify-center rounded-full px-2 font-mono text-[10px] uppercase tracking-wide text-white",
				isActive ? "bg-emerald-600" : "bg-rose-600",
				className,
			)}
		>
			custom {isActive ? "active" : "inactive"}
		</div>
	);
}
