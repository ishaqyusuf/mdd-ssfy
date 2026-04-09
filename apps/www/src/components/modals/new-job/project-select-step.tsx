import { Icons } from "@gnd/ui/icons";
import { _trpc } from "@/components/static-trpc";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SearchInput } from "@/components/search-input";
import { Skeleton } from "@gnd/ui/skeleton";
import { StepTitle } from "./step-title";
import { SubHeader } from "./sub-header";
export function ProjectSelectStep({}) {
	const { setParams, ...params } = useJobFormParams();
	const [query, setQuery] = useState("");
	const { data, isPending } = useQuery(
		_trpc.community.projectsList.queryOptions(null, {
			staleTime: 1000 * 60 * 5,
		}),
	);

	const projects = data || [];
	const normalizedQuery = query.trim().toLowerCase();
	const results = useMemo(() => {
		if (!normalizedQuery) return projects;
		return projects.filter((item) => {
			return [item.title, item.builder?.name]
				.filter(Boolean)
				.some((value) =>
					String(value).toLowerCase().includes(normalizedQuery),
				);
		});
	}, [normalizedQuery, projects]);

	return (
		<div className="space-y-4">
			<StepTitle title="Select Project" />
			<SubHeader>
				<SearchInput
					value={query}
					onChangeText={setQuery}
					placeholder="Search projects..."
				/>
			</SubHeader>
			<LoadingSkeleton isPending={isPending}>
				<div className="space-y-2">
					{results.map((item) => (
						<button
							key={item.id}
							onClick={() => {
								setParams({
									projectId: item.id,
									unitId: null,
									modelId: null,
									builderTaskId: null,
									step: params.redirectStep || params.step + 1,
									redirectStep: null,
								});
							}}
							className={`w-full flex items-center gap-4 p-3 rounded-xl border text-left transition-all hover:shadow-md ${params.projectId === item.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}
						>
							<div className="p-2 bg-muted rounded-lg text-muted-foreground">
								<Icons.Building2 className="size-6" />
							</div>
							<div className="flex-1">
								<p className="text-sm font-bold text-foreground">
									{item.title}
								</p>
								<p className="text-xs text-muted-foreground">
									{item.builder.name}
								</p>
							</div>
							<Icons.ChevronRight
								size={16}
								className="text-muted-foreground"
							/>
						</button>
					))}
				</div>
			</LoadingSkeleton>
		</div>
	);
}

function LoadingSkeleton({ isPending, children }) {
	if (!isPending) return <>{children}</>;
	return (
		<div className="space-y-2">
			{[...Array(10)].map((item, itemId) => (
				<div
					key={itemId}
					className={`w-full flex items-center gap-4 p-3 rounded-xl border text-left transition-all hover:shadow-md  border-border bg-card hover:bg-muted/50`}
				>
					<div className="p-2 bg-muted rounded-lg text-muted-foreground">
						<Skeleton className="size-6" />
					</div>
					<div className="flex-1">
						<Skeleton className="w-1/2 h-4 mb-2" />
						<Skeleton className="w-1/3 h-3" />
					</div>
					<Skeleton className="size-4 text-muted-foreground" />
				</div>
			))}
		</div>
	);
}
