import { Badge } from "@gnd/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";

type PolicyHistoryItem = {
	id: string;
	version: number;
	title: string;
	publishedAt?: string | Date | null;
};

export function SpecialOrderPolicyHistory({
	policies,
	currentPolicyId,
}: {
	policies: PolicyHistoryItem[];
	currentPolicyId: string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Published policy history</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="divide-y rounded-md border">
					{policies.map((policy) => (
						<div
							key={policy.id}
							className="flex flex-wrap items-center justify-between gap-2 p-3"
						>
							<div>
								<p className="text-sm font-medium">
									v{policy.version} · {policy.title}
								</p>
								<p className="text-xs text-muted-foreground">
									{policy.publishedAt
										? new Intl.DateTimeFormat("en-US", {
												dateStyle: "medium",
												timeStyle: "short",
											}).format(new Date(policy.publishedAt))
										: "Publication time unavailable"}
								</p>
							</div>
							{policy.id === currentPolicyId ? (
								<Badge>Active</Badge>
							) : (
								<Badge variant="outline">Historical</Badge>
							)}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
