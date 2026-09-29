"use client";

import { useStorefrontCatalogFilterParams } from "@/hooks/use-storefront-catalog-filter-params";
import { uploadFile } from "@/lib/upload-file";
import { useTRPC } from "@/trpc/client";
import { resolveWorkflowComponentImageSrc } from "@gnd/sales/sales-form";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { type ChangeEvent, useEffect, useState } from "react";

function readGalleryImages(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return [];
	const galleryImages = (value as Record<string, unknown>).galleryImages;
	return Array.isArray(galleryImages)
		? galleryImages.map((image) => String(image || "").trim()).filter(Boolean)
		: [];
}

function readShippingNumber(value: unknown, key: string) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return "";
	const shipping = (value as Record<string, unknown>).shipping;
	if (!shipping || typeof shipping !== "object" || Array.isArray(shipping))
		return "";
	const number = Number((shipping as Record<string, unknown>)[key]);
	return Number.isFinite(number) && number > 0 ? String(number) : "";
}

export function StorefrontCatalogItemSheet() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { filters, setFilters } = useStorefrontCatalogFilterParams();
	const componentUid = filters.catalogItemId || "";
	const detail = useQuery(
		trpc.storefrontAdmin.catalog.detail.queryOptions(
			{ componentUid },
			{ enabled: Boolean(componentUid) },
		),
	);
	const saveProduct = useMutation(
		trpc.storefrontAdmin.catalog.saveProduct.mutationOptions(),
	);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>([]);
	const [shippingWeightPerUnitLb, setShippingWeightPerUnitLb] = useState("");
	const [shippingLbPerLinearFoot, setShippingLbPerLinearFoot] = useState("");
	const [shippingShelfCategoryId, setShippingShelfCategoryId] = useState("");
	const [online, setOnline] = useState(false);
	const [featured, setFeaturedValue] = useState(false);
	const [uploading, setUploading] = useState(false);

	useEffect(() => {
		if (!detail.data) return;
		setTitle(
			detail.data.offer?.title ||
				detail.data.overlay?.title ||
				detail.data.source.title,
		);
		setDescription(
			detail.data.offer?.description || detail.data.overlay?.description || "",
		);
		setImageUrl(
			detail.data.offer?.imageUrl ||
				detail.data.overlay?.imageUrl ||
				detail.data.source.imageUrl ||
				"",
		);
		setGalleryImageUrls(readGalleryImages(detail.data.overlay?.metadata));
		setShippingWeightPerUnitLb(
			readShippingNumber(detail.data.overlay?.metadata, "weightPerUnitLb"),
		);
		setShippingLbPerLinearFoot(
			readShippingNumber(detail.data.overlay?.metadata, "lbPerLinearFoot"),
		);
		setShippingShelfCategoryId(
			readShippingNumber(detail.data.overlay?.metadata, "shelfCategoryId"),
		);
		setOnline(
			Boolean(detail.data.overlay?.availableOnStorefront) &&
				detail.data.overlay?.status === "PUBLISHED",
		);
		setFeaturedValue(Boolean(detail.data.offer?.featured));
	}, [detail.data]);

	async function refresh() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.catalog.list.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.catalog.families.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.catalog.detail.queryKey({
					componentUid,
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.storefrontAdmin.categories.products.queryKey(),
			}),
		]);
	}

	async function submit(status: "DRAFT" | "PUBLISHED") {
		try {
			await saveProduct.mutateAsync({
				componentUid,
				title: title.trim() || null,
				description: description.trim() || null,
				imageUrl: imageUrl.trim() || null,
				galleryImageUrls: galleryImageUrls
					.map((image) => image.trim())
					.filter(Boolean),
				shippingWeightPerUnitLb:
					detail.data?.source.family === "mouldings" || !shippingWeightPerUnitLb
						? null
						: Number(shippingWeightPerUnitLb),
				shippingLbPerLinearFoot:
					detail.data?.source.family !== "mouldings" || !shippingLbPerLinearFoot
						? null
						: Number(shippingLbPerLinearFoot),
				shippingShelfCategoryId:
					detail.data?.source.family !== "shelf-items" ||
					!shippingShelfCategoryId
						? null
						: Number(shippingShelfCategoryId),
				status,
				featured,
			});
			await refresh();
			toast({
				title: status === "PUBLISHED" ? "Product published" : "Draft saved",
				variant: "success",
			});
			await setFilters({ catalogItemId: null });
		} catch (error) {
			toast({
				title: "Unable to save catalog component",
				description:
					error instanceof Error ? error.message : "Please try again.",
				variant: "destructive",
			});
		}
	}

	async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files || []).slice(
			0,
			Math.max(0, 13 - galleryImageUrls.length),
		);
		if (!files.length) return;
		setUploading(true);
		try {
			const uploaded: string[] = [];
			for (const file of files) {
				const formData = new FormData();
				formData.append("file", file);
				const result = await uploadFile(formData, "dyke");
				if (result?.error) throw new Error(result.error.message);
				const url = String(result?.secure_url || "").trim();
				if (url) uploaded.push(url);
			}
			if (!uploaded.length) throw new Error("No image was uploaded.");
			setImageUrl((current) => current || uploaded[0] || "");
			setGalleryImageUrls((current) =>
				Array.from(new Set([...current, ...uploaded])).slice(0, 12),
			);
		} catch (error) {
			toast({
				title: "Unable to upload image",
				description: error instanceof Error ? error.message : "Please try again.",
				variant: "destructive",
			});
		} finally {
			setUploading(false);
			event.target.value = "";
		}
	}

	const pending = saveProduct.isPending || uploading;
	const resolvedCover = resolveWorkflowComponentImageSrc(imageUrl);

	return (
		<Sheet
			open={Boolean(componentUid)}
			onOpenChange={(open) => {
				if (!open) void setFilters({ catalogItemId: null });
			}}
		>
			<SheetContent className="w-full overflow-y-auto sm:max-w-xl">
				<SheetHeader>
					<SheetTitle>Edit catalog component</SheetTitle>
					<SheetDescription>
						Customer-facing metadata stays separate from canonical sales-form
						data.
					</SheetDescription>
				</SheetHeader>
				{detail.isPending ? (
					<div className="p-6 text-sm text-muted-foreground">
						Loading component...
					</div>
				) : detail.error ? (
					<div className="p-6 text-sm text-destructive">
						{detail.error.message}
					</div>
				) : detail.data ? (
					<form
						onSubmit={(event) => {
							event.preventDefault();
							void submit(online ? "PUBLISHED" : "DRAFT");
						}}
						className="space-y-5 p-5"
					>
						<div className="overflow-hidden rounded-md border bg-muted">
							{resolvedCover ? (
								<img
									src={resolvedCover}
									alt=""
									className="aspect-[4/3] w-full object-contain p-4"
								/>
							) : (
								<div className="flex aspect-[4/3] items-center justify-center text-sm text-muted-foreground">
									No image
								</div>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="catalog-title">Public title</Label>
							<Input
								id="catalog-title"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="catalog-description">Description</Label>
							<Textarea
								id="catalog-description"
								rows={5}
								value={description}
								onChange={(event) => setDescription(event.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="catalog-image">Image URL</Label>
							<Input
								id="catalog-image"
								value={imageUrl}
								onChange={(event) => setImageUrl(event.target.value)}
								placeholder={
									detail.data.source.imageUrl || "Default component image"
								}
							/>
						</div>
						<div className="space-y-3">
							<div className="flex items-center justify-between gap-3">
								<Label>Gallery images</Label>
								<label className="inline-flex h-9 cursor-pointer items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent">
									<Icons.Upload className="mr-2 size-4" />
									{uploading ? "Uploading…" : "Upload images"}
									<input type="file" accept="image/*" multiple className="sr-only" disabled={uploading || galleryImageUrls.length >= 12} onChange={uploadImages} />
								</label>
							</div>
							{galleryImageUrls.length ? (
								<div className="space-y-2">
									{galleryImageUrls.map((image, index) => (
										<div
											key={`${index}-${image}`}
											className="flex items-center gap-2"
										>
											<div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-muted">
											{resolveWorkflowComponentImageSrc(image) ? (
												<img
													src={resolveWorkflowComponentImageSrc(image) || ""}
														alt=""
														className="size-full object-contain"
													/>
												) : (
													<Icons.Image className="size-4 text-muted-foreground" />
												)}
											</div>
										<Input
												aria-label={`Gallery image ${index + 1} URL`}
												value={image}
												onChange={(event) =>
													setGalleryImageUrls((current) =>
														current.map((value, currentIndex) =>
															currentIndex === index
																? event.target.value
																: value,
														),
													)
												}
											/>
											<Button
												type="button"
												variant={imageUrl === image ? "default" : "outline"}
												size="sm"
												onClick={() => setImageUrl(image)}
												disabled={!image}
											>
												{imageUrl === image ? "Cover" : "Set cover"}
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												aria-label={`Move gallery image ${index + 1} up`}
												disabled={index === 0}
												onClick={() =>
													setGalleryImageUrls((current) => {
														const next = [...current];
														[next[index - 1], next[index]] = [
															next[index] || "",
															next[index - 1] || "",
														];
														return next;
													})
												}
											>
												<Icons.ChevronUp className="size-4" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												aria-label={`Remove gallery image ${index + 1}`}
												onClick={() =>
													setGalleryImageUrls((current) =>
														current.filter(
															(_, currentIndex) => currentIndex !== index,
														),
													)
												}
											>
												<Icons.Trash className="size-4" />
											</Button>
										</div>
									))}
								</div>
							) : (
								<p className="text-xs text-muted-foreground">
									No additional product images.
								</p>
							)}
						</div>
						<div className="rounded-md border bg-muted/30 p-4">
							<div className="mb-3">
								<p className="text-sm font-medium">Shipping weight override</p>
								<p className="text-xs text-muted-foreground">
									This catalog value overrides the general shipping setting for
									this item.
								</p>
							</div>
							{detail.data.source.family === "mouldings" ? (
								<div className="space-y-2">
									<Label htmlFor="catalog-shipping-lb-per-foot">
										Weight per linear foot (lb)
									</Label>
									<Input
										id="catalog-shipping-lb-per-foot"
										type="number"
										min="0"
										step="0.01"
										placeholder="Use general moulding weight"
										value={shippingLbPerLinearFoot}
										onChange={(event) =>
											setShippingLbPerLinearFoot(event.target.value)
										}
									/>
								</div>
							) : (
								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="catalog-shipping-unit-weight">
											Weight per unit (lb)
										</Label>
										<Input
											id="catalog-shipping-unit-weight"
											type="number"
											min="0"
											step="0.01"
											placeholder={
												detail.data.source.family === "doors"
													? "Use the selected door-size weight"
													: "Use the shelf-category weight"
											}
											value={shippingWeightPerUnitLb}
											onChange={(event) =>
												setShippingWeightPerUnitLb(event.target.value)
											}
										/>
										</div>
									{detail.data.source.family === "shelf-items" ? (
										<div className="space-y-2">
											<Label htmlFor="catalog-shipping-shelf-category">
												Default shelf category
											</Label>
											<select
												id="catalog-shipping-shelf-category"
												className="h-9 w-full rounded-md border bg-background px-3 text-sm"
												value={shippingShelfCategoryId}
												onChange={(event) =>
													setShippingShelfCategoryId(event.target.value)
												}
											>
												<option value="">No category default</option>
												{detail.data.shelfCategories.map((category) => (
													<option key={category.id} value={category.id}>
														{category.name}
													</option>
												))}
											</select>
										</div>
									) : null}
								</div>
							)}
						</div>
						<div className="flex items-center justify-between border-y py-4">
							<div>
								<p className="text-sm font-medium">Online</p>
								<p className="text-xs text-muted-foreground">
									Available to public storefront configuration.
								</p>
							</div>
							<Switch checked={online} onCheckedChange={setOnline} />
						</div>
						<div className="flex items-center justify-between border-b pb-4">
							<div>
								<div className="flex items-center gap-2">
									<p className="text-sm font-medium">Featured</p>
									{!detail.data.offer ? (
										<Badge variant="secondary">Product required</Badge>
									) : null}
								</div>
								<p className="text-xs text-muted-foreground">
									Shown in the public featured catalog.
								</p>
							</div>
							<Switch
								disabled={!detail.data.offer}
								checked={featured}
								onCheckedChange={setFeaturedValue}
							/>
						</div>
						<div className="sticky bottom-0 flex gap-2 border-t bg-background py-4">
							<Button type="button" variant="outline" disabled={pending} className="flex-1" onClick={() => void submit("DRAFT")}>Save draft</Button>
							<Button type="button" disabled={pending || !detail.data.offer} className="flex-1" onClick={() => void submit("PUBLISHED")}>
								{pending ? "Saving…" : "Publish"}
							</Button>
						</div>
					</form>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
