import { useEffect, useState } from "react";
import { updateShelfItemAction } from "@/actions/update-shelf-product";
import { AnimatedNumber } from "@/components/animated-number";
import { NumberInput } from "@/components/currency-input";
import { useDebounce } from "@/hooks/use-debounce";
import { useShelf } from "@/hooks/use-shelf";
import { useShelfItem } from "@/hooks/use-shelf-item";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";

export function ShelfPriceCell({ product, prodUid }) {
    const { basePrice, productId, customPrice, salesPrice } = product || {};
    const ctx = useShelfItem();
    const shelf = useShelf();
    //    useEffect(() => {},[])
    const [basePriceInput, setBasePriceInput] = useState(basePrice);
    const [open, onOpenChange] = useState(false);
    const deb = useDebounce(basePriceInput, 300);

    useEffect(() => {
        if (deb != basePrice) {
            updateShelfItemAction(productId, {
                unitPrice: Number(deb),
            }).then((resp) => {
                ctx.dotUpdateProduct(prodUid, "basePrice", deb);
                let _salesPrice = shelf.costCls.calculateSales(deb);
                ctx.dotUpdateProduct(prodUid, "salesPrice", _salesPrice);
                ctx.refreshProds();
                shelf.costCls.shelfItemCostUpdated(
                    shelf.itemUid,
                    _salesPrice,
                    productId,
                );
                // shelf.costCls.updateShelfCosts(shelf.itemUid);
            });
        }
    }, [deb]);

    if (!product) return null;
    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button disabled={!productId} size="xs" variant="outline">
                    <AnimatedNumber
                        value={
                            Number.isInteger(customPrice)
                                ? customPrice
                                : salesPrice || 0
                        }
                    />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">
                            Edit Product Price
                        </h4>
                        <p className="text-sm text-muted-foreground">
                            Edit product cost price
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <div className="grid grid-cols-5 items-center gap-4">
                            <Label className="col-span-2">Cost Price</Label>
                            <div className="col-span-2">
                                <NumberInput
                                    value={basePrice}
                                    onValueChange={(values) => {
                                        setBasePriceInput(values.floatValue);
                                    }}
                                    prefix={"$"}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-5 items-center gap-4">
                            <Label className="col-span-2">Custom Price</Label>
                            <div className="col-span-2">
                                <NumberInput
                                    className=""
                                    value={customPrice}
                                    onValueChange={(values) => {
                                        ctx.dotUpdateProduct(
                                            prodUid,
                                            "customPrice",
                                            values.floatValue,
                                        );
                                    }}
                                    prefix={"$"}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
