import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { useInventoryProductForm } from "./form-context";
import { Eye, EyeOff, Package } from "lucide-react";
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
import { ProductImage } from "@/components/product-image-gallery";

export function ProductInformationSection({}) {
    const form = useInventoryProductForm();

    const stockMonitor = form.watch("product.stockMonitor");
    return (
        <AccordionItem value="general">
            <AccordionTrigger className="">
                <div className="flex gap-4 items-center">
                    <Package className="size-4" />
                    <span>Product Information</span>
                    <Progress>
                        <Progress.Status>draft</Progress.Status>
                    </Progress>
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
                    <FormInput
                        label="Category"
                        placeholder="Select Category"
                        control={form.control}
                        name="product.categoryId"
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
                    <Separator className="col-span-2" />
                    <ProductImage />
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

