"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Button } from "@gnd/ui/button";
import { toast } from "@gnd/ui/use-toast";
import { SettingsCard, SwitchRow } from "./settings-card";

export function ProductionReceivingSettings() {
	const trpc = useTRPC();
	const client = useQueryClient();
	const query = useQuery(
		trpc.sales.getProductionReceivingSettings.queryOptions(),
	);
	const mutation = useMutation(
		trpc.sales.updateProductionReceivingSettings.mutationOptions({
			onSuccess: async () => {
				await client.invalidateQueries({
					queryKey: trpc.sales.getProductionReceivingSettings.queryKey(),
				});
				toast({
					title: "Production receiving policy saved",
					variant: "success",
				});
			},
			onError: async (error) => {
				await client.invalidateQueries({
					queryKey: trpc.sales.getProductionReceivingSettings.queryKey(),
				});
				toast({
					title: "Unable to save policy",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	return (
		<SettingsCard
			title="Production receiving"
			description="Let workers confirm materials for their assigned work. Unresolved submissions still require review."
		>
			{query.isError ? (
				<Button variant="outline" onClick={() => query.refetch()}>
					Retry loading receiving policy
				</Button>
			) : (
				<SwitchRow
					title="Allow production workers to receive inbound materials"
					description="Workers can receive linked materials and apply them to their assigned Needs."
					checked={query.data?.settings.workerCanReceiveInbound ?? false}
					disabled={!query.data || mutation.isPending}
					onCheckedChange={(workerCanReceiveInbound) => {
						if (query.data)
							mutation.mutate({
								workerCanReceiveInbound,
								expectedRevision: query.data.settings.revision,
							});
					}}
				/>
			)}
		</SettingsCard>
	);
}
