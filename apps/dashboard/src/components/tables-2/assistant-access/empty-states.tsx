import { Users } from "lucide-react";

export function EmptyState({ hasSearch }: { hasSearch: boolean }) {
	return (
		<div className="flex min-h-72 flex-col items-center justify-center border-x border-b text-center">
			<div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
				<Users className="size-5 text-muted-foreground" />
			</div>
			<p className="font-medium">
				{hasSearch ? "No matching employees" : "No employees found"}
			</p>
			<p className="mt-1 max-w-sm text-sm text-muted-foreground">
				{hasSearch
					? "Try a different name or email address."
					: "Employees will appear here after an account is created."}
			</p>
		</div>
	);
}
