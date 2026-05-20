"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Field, formatDate } from "./shared";

export function DealerSalesProfiles() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [editingProfile, setEditingProfile] = useState<{
		id: number;
		title: string;
		salesPercentage: number | null;
		defaultProfile: boolean | null;
	} | null>(null);
	const profilesQuery = useQuery(
		trpc.dealerPortal.salesProfiles.queryOptions(),
	);
	const saveProfile = useMutation(
		trpc.dealerPortal.saveSalesProfile.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.dealerPortal.salesProfiles.pathKey(),
				});
				toast({
					title: "Sales profile saved.",
					variant: "success",
				});
				setEditingProfile(null);
			},
			onError: (error) => {
				toast({
					title: "Could not save profile.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const salesPercentage = Number(form.get("salesPercentage") || 0);

		saveProfile.mutate({
			id: editingProfile?.id || null,
			title: String(form.get("title") || ""),
			salesPercentage: Number.isFinite(salesPercentage)
				? salesPercentage
				: null,
			defaultProfile: form.get("defaultProfile") === "on",
		});

		event.currentTarget.reset();
	}

	const profiles = profilesQuery.data ?? [];

	return (
		<div className="space-y-6">
			<section className="rounded-lg border bg-background p-4">
				<h3 className="mb-4 text-base font-semibold">
					{editingProfile ? "Edit sales profile" : "Add sales profile"}
				</h3>
				<form
					className="grid gap-3 md:grid-cols-[1fr_minmax(260px,360px)_auto]"
					key={editingProfile?.id || "new-profile"}
					onSubmit={onSubmit}
				>
					<Field
						defaultValue={editingProfile?.title || ""}
						label="Profile name"
						name="title"
						required
					/>
					<Field
						defaultValue={editingProfile?.salesPercentage ?? ""}
						description="Enter the percentage adjustment for this profile. 25 means prices increase by 25%; -10 means prices decrease by 10%. Example: $80 + 25% = $100."
						label="Price adjustment %"
						name="salesPercentage"
						step="0.01"
						type="number"
					/>
					<label className="flex items-end gap-2 pb-2 text-sm">
						<input
							className="size-4"
							defaultChecked={!!editingProfile?.defaultProfile}
							name="defaultProfile"
							type="checkbox"
						/>
						Default
					</label>
					<div className="flex gap-2 md:col-span-3">
						<Button disabled={saveProfile.isPending} type="submit">
							<Save className="mr-2 size-4" />
							{saveProfile.isPending ? "Saving..." : "Save profile"}
						</Button>
						{editingProfile ? (
							<Button
								onClick={() => setEditingProfile(null)}
								type="button"
								variant="outline"
							>
								Cancel
							</Button>
						) : null}
					</div>
				</form>
			</section>

			<section className="rounded-lg border bg-background">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Profile</TableHead>
							<TableHead>Price adjustment</TableHead>
							<TableHead>Customers</TableHead>
							<TableHead>Default</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{profilesQuery.isPending ? (
							<TableRow>
								<TableCell className="h-24 text-center" colSpan={6}>
									Loading profiles...
								</TableCell>
							</TableRow>
						) : profiles.length ? (
							profiles.map((profile) => (
								<TableRow key={profile.id}>
									<TableCell className="font-medium">{profile.title}</TableCell>
									<TableCell>
										{profile.salesPercentage != null
											? `${profile.salesPercentage}%`
											: "-"}
									</TableCell>
									<TableCell>{profile._count.customers}</TableCell>
									<TableCell>
										{profile.defaultProfile ? (
											<Badge variant="outline">Default</Badge>
										) : (
											"-"
										)}
									</TableCell>
									<TableCell>{formatDate(profile.createdAt)}</TableCell>
									<TableCell className="text-right">
										<Button
											onClick={() =>
												setEditingProfile({
													id: profile.id!,
													title: profile.title || "",
													salesPercentage: profile.salesPercentage ?? null,
													defaultProfile: profile.defaultProfile ?? false,
												})
											}
											size="sm"
											type="button"
											variant="outline"
										>
											Edit
										</Button>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell className="h-24 text-center" colSpan={6}>
									No sales profiles yet.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</section>
		</div>
	);
}
