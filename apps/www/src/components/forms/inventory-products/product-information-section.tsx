import { useInventoryForm } from "./form-context";
import { DollarSign, Eye, EyeOff, Package } from "lucide-react";
import { Progress } from "@/components/(clean-code)/progress";
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import FormInput from "@/components/common/controls/form-input";
import { FormCombobox } from "@/components/common/controls/form-combobox";
import { INVENTORY_STATUS_OPTIONS } from "@sales/constants";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import { Label } from "@gnd/ui/label";
import { FormDescription } from "@gnd/ui/form";
import { cn } from "@gnd/ui/cn";
import { Separator } from "@gnd/ui/separator";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { useTRPC } from "@/trpc/client";
import { selectOptions } from "@gnd/utils";
import { useProduct } from "./context";
import { Badge } from "@gnd/ui/badge";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";
import { useEffect } from "react";
import { useInventoryParams } from "@/hooks/use-inventory-params";

export function ProductInformationSection({}) {
    const form = useInventoryForm();
    const trpc = useTRPC();
    const { categoryList } = useInventoryTrpc({
        enableCategoryList: true,
    });
    const { _mode, mode } = useInventoryParams();
    useEffect(() => {
        if (_mode.communitySection && categoryList?.length) {
            const catId = categoryList.find(
                (c) => c.title == "Community Sections",
            )?.id;
            if (catId) form.setValue("product.categoryId", catId);
        }
    }, [mode, categoryList]);
    const {
        stockMonitor,
        status,
        primaryStoreFront,
        isPriceEnabled,
        categoryId,
        inventoryId,
    } = useProduct();
    const category = categoryList?.find((c) => c.id === categoryId);
    return (
        <AccordionItem value="general">
            <AccordionTrigger className="">
                <div className="flex gap-4 items-center">
                    <Package className="size-4" />
                    <span>Product Information</span>
                    <Progress>
                        <Progress.Status>{status || "draft"}</Progress.Status>
                    </Progress>
                    {!stockMonitor || (
                        <Badge variant="outline" className="gap-1">
                            <EyeOff className="h-3 w-3" />
                            Stock Unmonitored
                        </Badge>
                    )}
                    {!isPriceEnabled && (
                        <Badge variant="outline" className="gap-1">
                            <DollarSign className="h-3 w-3" />
                            Price Disabled
                        </Badge>
                    )}
                </div>
            </AccordionTrigger>
            <AccordionContent className="">
                <div className="grid grid-cols-2 gap-4">
                    <FormInput
                        label="Product Name"
                        placeholder="Enter product name"
                        control={form.control}
                        name="product.name"
                    />
                    <FormCombobox
                        label="Category"
                        control={form.control}
                        name="product.categoryId"
                        transformSelectionValue={(data) => Number(data.id)}
                        comboProps={{
                            placeholder: "Select Category",
                            items: selectOptions(categoryList, "title", "id"),
                            disabled: !!inventoryId,
                        }}
                    />
                    <FormInput
                        className="col-span-2"
                        placeholder="Enter product description"
                        label="Description"
                        control={form.control}
                        name="product.description"
                        type="textarea"
                    />
                    <Separator className="col-span-2" />
                    <div className="flex">
                        <FormCombobox
                            control={form.control}
                            name="product.status"
                            label="Publish Status"
                            comboProps={{
                                items: INVENTORY_STATUS_OPTIONS,
                            }}
                        />
                    </div>
                    <div className="">
                        <div className="grid gap-2">
                            <Label>Stock Monitoring</Label>
                            <FormCheckbox
                                switchInput
                                label={
                                    <div
                                        className={cn(
                                            "flex items-center gap-2",
                                            stockMonitor
                                                ? "text-green-500"
                                                : "text-muted-foreground",
                                        )}
                                    >
                                        {stockMonitor ? (
                                            <>
                                                <Eye className="size-4" />
                                                <span>Stock Monitored</span>
                                            </>
                                        ) : (
                                            <>
                                                <EyeOff className="size-4" />
                                                <span>Stock Unmonitored</span>
                                            </>
                                        )}
                                    </div>
                                }
                                control={form.control}
                                name="product.stockMonitor"
                            />
                            <FormDescription>
                                {stockMonitor
                                    ? `Stock levels will be tracked and displayed`
                                    : `Stock levels will not be tracked or displayed`}
                            </FormDescription>
                        </div>
                    </div>
                    {category?.title !== "Item Type" || (
                        <>
                            <Separator className="col-span-2" />
                            <div className="">
                                <div className="grid gap-2">
                                    <Label>Primary Store Front Category</Label>
                                    <FormCheckbox
                                        switchInput
                                        label={
                                            <div
                                                className={cn(
                                                    "flex items-center gap-2",
                                                    primaryStoreFront
                                                        ? "text-green-500"
                                                        : "text-muted-foreground",
                                                )}
                                            >
                                                {primaryStoreFront ? (
                                                    <>
                                                        <Eye className="size-4" />
                                                        <span>
                                                            Primary Store Front
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <EyeOff className="size-4" />
                                                        <span>
                                                            Primary Store Front
                                                            Disabled
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        }
                                        control={form.control}
                                        name="product.primaryStoreFront"
                                    />
                                    <FormDescription>
                                        {primaryStoreFront
                                            ? `This will be displayed on storefront homepage`
                                            : `This will not be displayed on storefront homepage`}
                                    </FormDescription>
                                </div>
                            </div>
                        </>
                    )}
                    <Separator className="col-span-2" />
                    <ProductImageGallery />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

