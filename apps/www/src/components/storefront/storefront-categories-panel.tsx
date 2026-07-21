"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";

export function StorefrontCategoriesPanel() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const categories = useQuery(
		trpc.storefrontAdmin.categories.list.queryOptions(),
	);
	const setStatus = useMutation(
		trpc.storefrontAdmin.categories.setStatus.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.storefrontAdmin.categories.list.queryKey(),
				});
				toast({ title: "Category status updated", variant: "success" });
			},
			onError: (error) =>
				toast({
					title: "Unable to update category",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);

	return (
		<section
			className="space-y-4"
			aria-labelledby="storefront-categories-title"
		>
			<div>
				<h2 id="storefront-categories-title" className="text-lg font-semibold">
					Categories
				</h2>
				<p className="text-sm text-muted-foreground">
					Public Item Type entry points and their catalog readiness.
				</p>
			</div>
			<div className="overflow-hidden rounded-md border bg-background">
				<table className="w-full text-sm">
					<thead className="border-b bg-muted/40 text-left text-muted-foreground">
						<tr>
							<th className="px-4 py-3 font-medium">Category</th>
							<th className="px-4 py-3 font-medium">Slug</th>
							<th className="px-4 py-3 font-medium">Products</th>
							<th className="px-4 py-3 font-medium">Readiness</th>
							<th className="px-4 py-3 text-right font-medium">Online</th>
						</tr>
					</thead>
					<tbody className="divide-y">
						{categories.isPending ? (
							<tr>
								<td
									colSpan={5}
									className="px-4 py-10 text-center text-muted-foreground"
								>
									Loading categories...
								</td>
							</tr>
						) : categories.error ? (
							<tr>
								<td
									colSpan={5}
									className="px-4 py-10 text-center text-destructive"
								>
									{categories.error.message}
								</td>
							</tr>
						) : categories.data?.length ? (
							categories.data.map((category) => (
								<tr key={category.id}>
									<td className="px-4 py-3 font-medium">{category.title}</td>
									<td className="px-4 py-3 text-muted-foreground">
										/{category.slug}
									</td>
									<td className="px-4 py-3">{category._count.offers}</td>
									<td className="px-4 py-3">
										{category.listingStepUid ? (
											<Badge variant="secondary">Configured</Badge>
										) : (
											<Badge variant="destructive">Missing listing step</Badge>
										)}
									</td>
									<td className="px-4 py-3 text-right">
										<Switch
											checked={category.status === "PUBLISHED"}
											disabled={setStatus.isPending}
											onCheckedChange={(checked) =>
												setStatus.mutate({
													id: category.id,
													status: checked ? "PUBLISHED" : "DRAFT",
												})
											}
											aria-label={`${category.title} online`}
										/>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td
									colSpan={5}
									className="px-4 py-10 text-center text-muted-foreground"
								>
									No storefront categories yet.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}
