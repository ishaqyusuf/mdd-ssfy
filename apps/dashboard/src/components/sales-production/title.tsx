import Link from "@/components/link";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function SalesProductionTitle() {
	return (
		<div className="flex flex-wrap items-start justify-between gap-3">
			<div className="space-y-1">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						Sales Production
					</h1>
					<Badge variant="outline" className="rounded-full text-[10px]">
						Workspace
					</Badge>
				</div>
				<p className="text-sm text-muted-foreground">
					Schedule, assign, review, and complete production work from one queue.
				</p>
			</div>
			<Button asChild variant="outline" size="sm" className="h-9 gap-2">
				<Link href="/production/dashboard">
					<Icons.employees className="size-4" />
					Worker dashboard
				</Link>
			</Button>
		</div>
	);
}
