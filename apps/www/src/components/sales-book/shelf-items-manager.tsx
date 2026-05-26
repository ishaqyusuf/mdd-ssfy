"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { resolveWorkflowComponentImageSrc } from "@gnd/sales/sales-form";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { Switch } from "@gnd/ui/switch";
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
import { useMemo, useState } from "react";

type Product = RouterOutputs["salesShelfItems"]["listProducts"]["data"][number];
type Category = RouterOutputs["salesShelfItems"]["listCategories"][number];
type StatusFilter = "all" | "active" | "disabled";

type ProductFormState = {
    id: number | null;
    title: string;
    unitPrice: string;
    parentCategoryId: string;
    categoryId: string;
    img: string;
    enabled: boolean;
};

const emptyForm: ProductFormState = {
    id: null,
    title: "",
    unitPrice: "",
    parentCategoryId: "",
    categoryId: "",
    img: "",
    enabled: true,
};

function money(value?: number | null) {
    if (value == null || Number.isNaN(Number(value))) return "-";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(Number(value));
}

function categoryLabel(product: Product) {
    return (
        product.categoryPath?.map((category) => category.name).join(" / ") ||
        "-"
    );
}

function formFromProduct(product: Product): ProductFormState {
    return {
        id: product.id,
        title: product.title || "",
        unitPrice: product.unitPrice == null ? "" : String(product.unitPrice),
        parentCategoryId: product.parentCategoryId
            ? String(product.parentCategoryId)
            : "",
        categoryId: product.categoryId ? String(product.categoryId) : "",
        img: product.img || "",
        enabled: product.active,
    };
}

function numberOrNull(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

export function ShelfItemsManager() {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const [query, setQuery] = useState("");
    const [categoryId, setCategoryId] = useState("all");
    const [status, setStatus] = useState<StatusFilter>("active");
    const [page, setPage] = useState(1);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState<ProductFormState>(emptyForm);

    const filters = useMemo(
        () => ({
            query,
            categoryId: categoryId === "all" ? null : Number(categoryId),
            status,
            page,
            limit: 50,
        }),
        [categoryId, page, query, status],
    );

    const productsQuery = useQuery(
        trpc.salesShelfItems.listProducts.queryOptions(filters),
    );
    const categoriesQuery = useQuery(
        trpc.salesShelfItems.listCategories.queryOptions({}),
    );

    const categories = categoriesQuery.data || [];
    const parentCategories = categories.filter(
        (category) => category.type === "parent",
    );
    const selectedParentId = Number(form.parentCategoryId || 0);
    const childCategories = categories.filter((category) => {
        if (category.type !== "child") return false;
        if (!selectedParentId) return true;
        return (
            Number(category.parentCategoryId || 0) === selectedParentId ||
            Number(category.categoryId || 0) === selectedParentId
        );
    });

    const refresh = () => {
        queryClient.invalidateQueries({
            queryKey: trpc.salesShelfItems.listProducts.pathKey(),
        });
        queryClient.invalidateQueries({
            queryKey: trpc.salesShelfItems.listCategories.pathKey(),
        });
        queryClient.invalidateQueries({
            queryKey: trpc.newSalesForm.getShelfCategories.pathKey(),
        });
        queryClient.invalidateQueries({
            queryKey: trpc.newSalesForm.getShelfProducts.pathKey(),
        });
        queryClient.invalidateQueries({
            queryKey: trpc.newSalesForm.getShelfProductIndex.pathKey(),
        });
        queryClient.invalidateQueries({
            queryKey: trpc.newSalesForm.searchShelfProducts.pathKey(),
        });
    };

    const createProduct = useMutation(
        trpc.salesShelfItems.createProduct.mutationOptions({
            onSuccess() {
                refresh();
                setDialogOpen(false);
                setForm(emptyForm);
                toast({ title: "Product created", variant: "success" });
            },
            onError(error) {
                toast({
                    title: "Unable to create product",
                    description: error.message,
                    variant: "error",
                });
            },
        }),
    );
    const updateProduct = useMutation(
        trpc.salesShelfItems.updateProduct.mutationOptions({
            onSuccess() {
                refresh();
                setDialogOpen(false);
                setForm(emptyForm);
                toast({ title: "Product updated", variant: "success" });
            },
            onError(error) {
                toast({
                    title: "Unable to update product",
                    description: error.message,
                    variant: "error",
                });
            },
        }),
    );
    const toggleProduct = useMutation(
        trpc.salesShelfItems.toggleProduct.mutationOptions({
            onSuccess() {
                refresh();
            },
            onError(error) {
                toast({
                    title: "Unable to update product status",
                    description: error.message,
                    variant: "error",
                });
            },
        }),
    );
    const toggleCategory = useMutation(
        trpc.salesShelfItems.toggleCategory.mutationOptions({
            onSuccess() {
                refresh();
            },
            onError(error) {
                toast({
                    title: "Unable to update category status",
                    description: error.message,
                    variant: "error",
                });
            },
        }),
    );

    const openNewProduct = () => {
        setForm(emptyForm);
        setDialogOpen(true);
    };

    const submitProduct = () => {
        const payload = {
            title: form.title,
            unitPrice: numberOrNull(form.unitPrice),
            parentCategoryId: form.parentCategoryId
                ? Number(form.parentCategoryId)
                : null,
            categoryId: form.categoryId ? Number(form.categoryId) : null,
            img: form.img.trim() || null,
            enabled: form.enabled,
        };
        if (form.id) {
            updateProduct.mutate({ ...payload, id: form.id });
            return;
        }
        createProduct.mutate(payload);
    };

    const imagePreview = resolveWorkflowComponentImageSrc(form.img);
    const isSubmitting = createProduct.isPending || updateProduct.isPending;

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-normal">
                        Shelf Items
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage sales-form shelf products, prices, images, and
                        catalog visibility.
                    </p>
                </div>
                <Button onClick={openNewProduct}>
                    <Icons.Add className="mr-2 size-4" />
                    Add Product
                </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_220px_160px]">
                <div className="grid gap-1.5">
                    <Label htmlFor="shelf-product-search">Search</Label>
                    <Input
                        id="shelf-product-search"
                        value={query}
                        onChange={(event) => {
                            setPage(1);
                            setQuery(event.target.value);
                        }}
                        placeholder="Product name"
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label>Category</Label>
                    <Select
                        value={categoryId}
                        onValueChange={(value) => {
                            setPage(1);
                            setCategoryId(value);
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {categories.map((category) => (
                                <SelectItem
                                    key={category.id}
                                    value={String(category.id)}
                                >
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-1.5">
                    <Label>Status</Label>
                    <Select
                        value={status}
                        onValueChange={(value) => {
                            setPage(1);
                            setStatus(value as StatusFilter);
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                            <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="overflow-hidden rounded-md border bg-background">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[52px]">Image</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[132px] text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {productsQuery.isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="h-24 text-center"
                                >
                                    Loading shelf products...
                                </TableCell>
                            </TableRow>
                        ) : productsQuery.data?.data.length ? (
                            productsQuery.data.data.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <div className="flex size-10 items-center justify-center overflow-hidden rounded-md bg-muted">
                                            {product.img ? (
                                                <img
                                                    src={
                                                        resolveWorkflowComponentImageSrc(
                                                            product.img,
                                                        ) || product.img
                                                    }
                                                    alt={product.title}
                                                    className="size-full object-cover"
                                                />
                                            ) : (
                                                <Icons.Package className="size-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">
                                            {product.title}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            #{product.id}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[280px] truncate">
                                            {categoryLabel(product)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {money(product.unitPrice)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge
                                                variant={
                                                    product.effectiveActive
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {product.effectiveActive
                                                    ? "Active"
                                                    : "Hidden"}
                                            </Badge>
                                            {product.active &&
                                            !product.categoryActive ? (
                                                <Badge variant="outline">
                                                    Category disabled
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            <Switch
                                                checked={product.active}
                                                disabled={
                                                    toggleProduct.isPending
                                                }
                                                onCheckedChange={(enabled) =>
                                                    toggleProduct.mutate({
                                                        id: product.id,
                                                        enabled,
                                                    })
                                                }
                                                aria-label={`Toggle ${product.title}`}
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setForm(
                                                        formFromProduct(
                                                            product,
                                                        ),
                                                    );
                                                    setDialogOpen(true);
                                                }}
                                            >
                                                <Icons.Edit className="size-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="h-24 text-center"
                                >
                                    No shelf products found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    {productsQuery.data
                        ? `${productsQuery.data.total} matching products`
                        : "Loading products"}
                </div>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={page <= 1 || productsQuery.isFetching}
                        onClick={() =>
                            setPage((value) => Math.max(1, value - 1))
                        }
                    >
                        Previous
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={
                            !productsQuery.data?.hasNextPage ||
                            productsQuery.isFetching
                        }
                        onClick={() => setPage((value) => value + 1)}
                    >
                        Next
                    </Button>
                </div>
            </div>

            <section className="grid gap-3">
                <div>
                    <h2 className="text-lg font-semibold tracking-normal">
                        Categories
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Disabling a category hides its products from sales-form
                        shelf pickers.
                    </p>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {categories.map((category) => (
                        <div
                            key={category.id}
                            className="flex items-center justify-between rounded-md border bg-background p-3"
                        >
                            <div className="min-w-0">
                                <div className="truncate font-medium">
                                    {category.name}
                                </div>
                                <div className="text-xs uppercase text-muted-foreground">
                                    {category.type}
                                </div>
                            </div>
                            <Switch
                                checked={category.active}
                                disabled={toggleCategory.isPending}
                                onCheckedChange={(enabled) =>
                                    toggleCategory.mutate({
                                        id: category.id,
                                        enabled,
                                    })
                                }
                                aria-label={`Toggle ${category.name}`}
                            />
                        </div>
                    ))}
                </div>
            </section>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {form.id
                                ? "Edit shelf product"
                                : "Add shelf product"}
                        </DialogTitle>
                        <DialogDescription>
                            Update the product details shown in the sales shelf
                            item picker.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="shelf-product-title">
                                Product name
                            </Label>
                            <Input
                                id="shelf-product-title"
                                value={form.title}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        title: event.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="shelf-product-price">
                                    Unit price
                                </Label>
                                <Input
                                    id="shelf-product-price"
                                    inputMode="decimal"
                                    value={form.unitPrice}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            unitPrice: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                <div>
                                    <Label>Enabled</Label>
                                    <div className="text-xs text-muted-foreground">
                                        Visible in shelf pickers when its
                                        category is enabled.
                                    </div>
                                </div>
                                <Switch
                                    checked={form.enabled}
                                    onCheckedChange={(enabled) =>
                                        setForm((current) => ({
                                            ...current,
                                            enabled,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label>Parent category</Label>
                                <Select
                                    value={form.parentCategoryId || "none"}
                                    onValueChange={(value) =>
                                        setForm((current) => ({
                                            ...current,
                                            parentCategoryId:
                                                value === "none" ? "" : value,
                                            categoryId: "",
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            None
                                        </SelectItem>
                                        {parentCategories.map((category) => (
                                            <SelectItem
                                                key={category.id}
                                                value={String(category.id)}
                                            >
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5">
                                <Label>Child category</Label>
                                <Select
                                    value={form.categoryId || "none"}
                                    onValueChange={(value) =>
                                        setForm((current) => ({
                                            ...current,
                                            categoryId:
                                                value === "none" ? "" : value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            None
                                        </SelectItem>
                                        {childCategories.map((category) => (
                                            <SelectItem
                                                key={category.id}
                                                value={String(category.id)}
                                            >
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-[1fr_88px]">
                            <div className="grid gap-1.5">
                                <Label htmlFor="shelf-product-image">
                                    Image URL or path
                                </Label>
                                <Input
                                    id="shelf-product-image"
                                    value={form.img}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            img: event.target.value,
                                        }))
                                    }
                                    placeholder="https://... or cloudinary path"
                                />
                            </div>
                            <div className="flex size-[88px] items-center justify-center overflow-hidden rounded-md border bg-muted">
                                {imagePreview ? (
                                    <img
                                        src={imagePreview}
                                        alt=""
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <Icons.Package className="size-6 text-muted-foreground" />
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={!form.title.trim() || isSubmitting}
                            onClick={submitProduct}
                        >
                            {form.id ? "Update Product" : "Create Product"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
