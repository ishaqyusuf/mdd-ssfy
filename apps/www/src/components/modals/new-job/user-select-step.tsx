import { Icons } from "@gnd/ui/icons";
import { SearchInput } from "@/components/search-input";
import { _trpc } from "@/components/static-trpc";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { getInitials } from "@gnd/utils";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
	getInsuranceRequirement,
	type InsuranceRequirement,
} from "@gnd/utils/insurance-documents";

import { StepTitle } from "./step-title";
import { Skeleton } from "@gnd/ui/skeleton";
import { SubHeader } from "./sub-header";

function getInsuranceMeta(status: InsuranceRequirement) {
	switch (status.state) {
		case "valid":
			return {
				label: "Insurance approved",
				className: "text-emerald-600",
			};
		case "expiring_soon":
			return {
				label: "Insurance expiring soon",
				className: "text-amber-600",
			};
		case "pending":
			return {
				label: "Insurance pending review",
				className: "text-amber-600",
			};
		case "expired":
			return {
				label: "Insurance expired",
				className: "text-red-600",
			};
		case "rejected":
			return {
				label: "Insurance rejected",
				className: "text-red-600",
			};
		default:
			return {
				label: "Insurance missing",
				className: "text-red-600",
			};
	}
}

export function UserSelectStep() {
	const { data, isPending } = useQuery(
		_trpc.hrm.getEmployees.queryOptions({
			roles: ["1099 Contractor", "Punchout"],
			size: 500,
		}),
	);
	const users = data?.data || [];
	const { setParams, ...params } = useJobFormParams();
	const [query, setQuery] = useState("");
	const results = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return users;
		return users.filter((user) => {
			const haystack = [
				user.name,
				user.email,
				user.role,
				user.username,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return haystack.includes(normalizedQuery);
		});
	}, [users, query]);
	return (
		<div className="space-y-4">
			<StepTitle title="Select Contractor" />
			<SubHeader>
				<SearchInput
					value={query}
					onChangeText={setQuery}
					placeholder="Search contractor..."
				/>
			</SubHeader>
			<LoadingSkeleton isPending={isPending}>
				<div className="space-y-2">
					{results.map((user) => {
						const insuranceStatus = getInsuranceRequirement(
							user.documents || [],
						);
						const insuranceMeta = getInsuranceMeta(insuranceStatus);

						return (
							<button
								key={user.id}
								onClick={() => {
									setParams({
										userId: user.id,
										step: params.redirectStep || params.step + 1,
										redirectStep: null,
									});
								}}
								className={`w-full flex items-center gap-4 p-3 rounded-xl border text-left transition-all hover:shadow-md ${params.userId === user.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}
							>
								<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
									{getInitials(user.name) || user.name.charAt(0)}
								</div>
								<div className="flex-1">
									<p className="text-sm font-bold text-foreground">
										{user.name}
									</p>
									<p className="text-xs text-muted-foreground">{user.role}</p>
									<p
										className={`mt-1 text-xs font-medium ${insuranceMeta.className}`}
									>
										{insuranceMeta.label}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{insuranceStatus.message}
									</p>
								</div>
								<Icons.ChevronRight size={16} className="text-muted-foreground" />
							</button>
						);
					})}
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
					<div className="p-2 bg-muted rounded-full   text-muted-foreground">
						<Skeleton className="size-10" />
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
