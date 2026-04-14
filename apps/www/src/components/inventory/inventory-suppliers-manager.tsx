"use client";

import { useEffect, useMemo, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
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
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemHeader,
    ItemTitle,
} from "@gnd/ui/item";

type SupplierRecord = {
    id?: number | null;
    uid?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
};

type Props = {
    suppliers: SupplierRecord[];
    onSuppliersChange: (next: SupplierRecord[]) => void;
    defaultSupplierId?: number | null;
    onDefaultSupplierChange?: (supplierId: number | null) => void;
    showSyncButton?: boolean;
    title?: string;
    description?: string;
};

type EditorState = {
    open: boolean;
    supplier: SupplierRecord | null;
};

const emptySupplier: SupplierRecord = {
    id: null,
    uid: null,
    name: "",
    email: "",
    phone: "",
    address: "",
};

export function InventorySuppliersManager(props: Props) {
    const trpc = useTRPC();
    const [search, setSearch] = useState("");
    const [editor, setEditor] = useState<EditorState>({
        open: false,
        supplier: null,
    });

    const supplierReviewQuery = useQuery(
        trpc.inventories.inventorySupplierDykeReview.queryOptions(),
    );
    const searchQuery = useQuery(
        trpc.inventories.inventorySuppliers.queryOptions({
            q: search.trim() || null,
        }),
        {
            enabled: search.trim().length > 0,
        },
    );

    const saveSupplierMutation = useMutation(
        trpc.inventories.saveInventorySupplier.mutationOptions({
            onSuccess(saved) {
                const current = props.suppliers || [];
                const existingIndex = current.findIndex(
                    (supplier) => supplier.id === saved.id,
                );
                const next =
                    existingIndex >= 0
                        ? current.map((supplier, index) =>
                              index === existingIndex
                                  ? {
                                        id: saved.id,
                                        uid: saved.uid,
                                        name: saved.name,
                                        email: saved.email,
                                        phone: saved.phone,
                                        address: saved.address,
                                    }
                                  : supplier,
                          )
                        : [
                              {
                                  id: saved.id,
                                  uid: saved.uid,
                                  name: saved.name,
                                  email: saved.email,
                                  phone: saved.phone,
                                  address: saved.address,
                              },
                              ...current,
                          ];
                props.onSuppliersChange(next);
                setEditor({
                    open: false,
                    supplier: null,
                });
                setSearch("");
                supplierReviewQuery.refetch();
                toast({
                    title: "Supplier saved",
                    variant: "success",
                });
            },
        }),
    );

    const deleteSupplierMutation = useMutation(
        trpc.inventories.deleteInventorySupplier.mutationOptions({
            onSuccess(_, variables) {
                const next = (props.suppliers || []).filter(
                    (supplier) => supplier.id !== variables.id,
                );
                props.onSuppliersChange(next);
                if (props.defaultSupplierId === variables.id) {
                    props.onDefaultSupplierChange?.(null);
                }
                supplierReviewQuery.refetch();
                toast({
                    title: "Supplier deleted",
                    variant: "success",
                });
            },
        }),
    );

    const syncSuppliersMutation = useMutation(
        trpc.inventories.syncInventorySuppliersFromDyke.mutationOptions({
            onSuccess(data) {
                const merged = [...(props.suppliers || [])];
                data.forEach((supplier) => {
                    if (merged.find((item) => item.id === supplier.id)) return;
                    merged.push({
                        id: supplier.id,
                        uid: supplier.uid,
                        name: supplier.name,
                        email: supplier.email,
                        phone: supplier.phone,
                        address: supplier.address,
                    });
                });
                props.onSuppliersChange(merged);
                supplierReviewQuery.refetch();
                toast({
                    title: "Suppliers synced from Dyke",
                    variant: "success",
                });
            },
        }),
    );

    const normalizedSearch = search.trim().toLowerCase();
    const exactMatch = useMemo(
        () =>
            (searchQuery.data || []).find(
                (supplier) => supplier.name.trim().toLowerCase() === normalizedSearch,
            ) || null,
        [normalizedSearch, searchQuery.data],
    );
    const alreadySelected = (supplierId?: number | null) =>
        !!props.suppliers.find((supplier) => supplier.id === supplierId);

    const visibleMatches = (searchQuery.data || []).filter(
        (supplier) => !alreadySelected(supplier.id),
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                    {props.title ? (
                        <div className="space-y-1">
                            <div className="text-sm font-medium">{props.title}</div>
                            {props.description ? (
                                <div className="text-sm text-muted-foreground">
                                    {props.description}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
                {props.showSyncButton !== false ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => syncSuppliersMutation.mutate()}
                        disabled={syncSuppliersMutation.isPending}
                    >
                        <Icons.RefreshCw className="mr-2 size-4" />
                        Sync Door Suppliers
                    </Button>
                ) : null}
            </div>

            <Card>
                <CardContent className="space-y-4 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <Icons.Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="pl-9"
                                placeholder="Search supplier or add a new one"
                            />
                        </div>
                        <Button
                            type="button"
                            onClick={() =>
                                setEditor({
                                    open: true,
                                    supplier: {
                                        ...emptySupplier,
                                        name: search.trim(),
                                    },
                                })
                            }
                        >
                            <Icons.Plus className="mr-2 size-4" />
                            Add Supplier
                        </Button>
                    </div>

                    {normalizedSearch ? (
                        <div className="rounded-xl border bg-background">
                            <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Search Results
                            </div>
                            <div className="divide-y">
                                {visibleMatches.map((supplier) => (
                                    <button
                                        key={supplier.id}
                                        type="button"
                                        className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-muted/40"
                                        onClick={() => {
                                            props.onSuppliersChange([
                                                ...props.suppliers,
                                                {
                                                    id: supplier.id,
                                                    uid: supplier.uid,
                                                    name: supplier.name,
                                                    email: supplier.email,
                                                    phone: supplier.phone,
                                                    address: supplier.address,
                                                },
                                            ]);
                                            setSearch("");
                                        }}
                                    >
                                        <div className="space-y-1">
                                            <div className="font-medium">
                                                {supplier.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {supplier.uid || "No Dyke UID"}
                                            </div>
                                        </div>
                                        <Badge variant="outline">Add</Badge>
                                    </button>
                                ))}
                                {!exactMatch && normalizedSearch ? (
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-muted/40"
                                        onClick={() =>
                                            setEditor({
                                                open: true,
                                                supplier: {
                                                    ...emptySupplier,
                                                    name: search.trim(),
                                                },
                                            })
                                        }
                                    >
                                        <div className="space-y-1">
                                            <div className="font-medium">
                                                Create new "{search.trim()}"
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Add this supplier to the shared directory
                                            </div>
                                        </div>
                                        <Badge>New</Badge>
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    {props.suppliers.length ? (
                        <ItemGroup className="gap-2">
                            {props.suppliers.map((supplier) => {
                                const isDefault =
                                    !!props.onDefaultSupplierChange &&
                                    supplier.id === props.defaultSupplierId;
                                return (
                                    <Item
                                        key={supplier.id || supplier.uid || supplier.name}
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl"
                                    >
                                        <ItemContent className="min-w-0 gap-2">
                                            <ItemHeader>
                                                <ItemTitle className="min-w-0 flex-wrap">
                                                    <span className="truncate">{supplier.name}</span>
                                                    {isDefault ? (
                                                        <Badge>Default</Badge>
                                                    ) : null}
                                                    {supplier.uid ? (
                                                        <Badge variant="outline">
                                                            {supplier.uid}
                                                        </Badge>
                                                    ) : null}
                                                </ItemTitle>
                                                <ItemActions>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                    >
                                                        <Icons.MoreHorizontal className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {props.onDefaultSupplierChange ? (
                                                        <DropdownMenuItem
                                                            disabled={
                                                                !supplier.id || isDefault
                                                            }
                                                            onClick={() =>
                                                                props.onDefaultSupplierChange?.(
                                                                    supplier.id || null,
                                                                )
                                                            }
                                                        >
                                                            <Icons.Star className="mr-2 size-4" />
                                                            <span>Default</span>
                                                        </DropdownMenuItem>
                                                    ) : null}
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            setEditor({
                                                                open: true,
                                                                supplier,
                                                            })
                                                        }
                                                    >
                                                        <Icons.Edit className="mr-2 size-4" />
                                                        <span>Edit</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        disabled={!supplier.id}
                                                        onClick={() => {
                                                            if (!supplier.id) return;
                                                            deleteSupplierMutation.mutate({
                                                                id: supplier.id,
                                                            });
                                                        }}
                                                    >
                                                        <Icons.Trash className="mr-2 size-4" />
                                                        <span>Delete</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                                </ItemActions>
                                            </ItemHeader>
                                            <ItemDescription className="line-clamp-none text-xs">
                                                {[supplier.email, supplier.phone, supplier.address]
                                                    .filter(Boolean)
                                                    .join(" • ") || "No contact details yet"}
                                            </ItemDescription>
                                        </ItemContent>
                                    </Item>
                                );
                            })}
                        </ItemGroup>
                    ) : (
                        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                            No suppliers yet. Search for an existing supplier or
                            create a new one.
                        </div>
                    )}
                </CardContent>
            </Card>

            {supplierReviewQuery.data?.length ? (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Dyke Supplier Matching</CardTitle>
                        <CardDescription>
                            Review imported door supplier UIDs against the inventory supplier
                            directory.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {supplierReviewQuery.data.map((row) => (
                            <div
                                key={row.dykeSupplierId}
                                className="flex items-center justify-between rounded-xl border px-3 py-3"
                            >
                                <div className="space-y-1">
                                    <div className="font-medium">{row.dykeName || "-"}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {row.dykeUid || "No Dyke UID"}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">
                                        {row.supplierName || "No supplier match"}
                                    </span>
                                    <Badge variant={row.matched ? "default" : "outline"}>
                                        {row.matched ? "Matched" : "Needs match"}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ) : null}

            <SupplierEditorDialog
                open={editor.open}
                supplier={editor.supplier}
                onOpenChange={(open) =>
                    setEditor((prev) => ({
                        ...prev,
                        open,
                        supplier: open ? prev.supplier : null,
                    }))
                }
                onSubmit={(supplier) => saveSupplierMutation.mutate(supplier)}
                isPending={saveSupplierMutation.isPending}
            />
        </div>
    );
}

function SupplierEditorDialog(props: {
    open: boolean;
    supplier: SupplierRecord | null;
    onOpenChange: (open: boolean) => void;
    onSubmit: (supplier: SupplierRecord) => void;
    isPending?: boolean;
}) {
    const [draft, setDraft] = useState<SupplierRecord>(emptySupplier);

    useEffect(() => {
        setDraft(props.supplier || emptySupplier);
    }, [props.supplier]);

    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {draft.id ? "Edit Supplier" : "Create Supplier"}
                    </DialogTitle>
                    <DialogDescription>
                        Maintain the shared supplier directory used across inventory
                        pricing and inbound purchasing.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                            value={draft.name || ""}
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    name: event.target.value,
                                }))
                            }
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Legacy UID</label>
                        <Input
                            value={draft.uid || ""}
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    uid: event.target.value,
                                }))
                            }
                        />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                value={draft.email || ""}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        email: event.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Phone</label>
                            <Input
                                value={draft.phone || ""}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        phone: event.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Address</label>
                        <Input
                            value={draft.address || ""}
                            onChange={(event) =>
                                setDraft((current) => ({
                                    ...current,
                                    address: event.target.value,
                                }))
                            }
                        />
                    </div>
                </div>
                <DialogFooter className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => props.onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={!draft.name?.trim() || props.isPending}
                        onClick={() =>
                            props.onSubmit({
                                ...draft,
                                name: draft.name.trim(),
                                uid: draft.uid?.trim() || null,
                                email: draft.email?.trim() || null,
                                phone: draft.phone?.trim() || null,
                                address: draft.address?.trim() || null,
                            })
                        }
                    >
                        Save Supplier
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
