import React, { useEffect, useState } from "react";
import { MenuItem } from "@/components/_v1/data-table/data-table-row-actions";
import { Icons } from "@/components/_v1/icons";
import { cn } from "@/lib/utils";

import { DropdownMenuGroup, DropdownMenuLabel } from "@gnd/ui/dropdown-menu";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { IStepProducts } from ".";
import { updateDoorMetaAction } from "../../../../_action/save-step-product";
import { ProductImage } from "./product";

export default function DoorMenuOption({ setStepProducts, products, prod }) {
    const [prods, setProds] = useState([]);
    useEffect(() => {
        setProds(
            (products as IStepProducts)
                .filter((p) => p.id != prod.id)
                .map((product) => {
                    let pricings = product.product?.meta?.doorPrice || {};
                    let importables = [
                        { title: "All", count: 0, priceData: {} },
                    ];
                    let heights = Array.from(
                        new Set(
                            Object.keys(pricings).map(
                                (k) => k.split(" ").reverse()[0],
                            ),
                        ),
                    );
                    let prices = Object.entries(pricings).map(([a, b]) => ({
                        height: a.split(" ").reverse()[0],
                        price: b,
                        size: a,
                    }));
                    heights.map((h) => {
                        let priceData = {};
                        const _p = prices.filter(
                            (a) => a.height == h && a.price,
                        );
                        _p.map((p) => {
                            priceData[p.size] = p.price;
                        });
                        let count = _p.length;
                        importables[0].count += count;
                        importables[0].priceData = {
                            ...importables[0].priceData,
                            ...priceData,
                        };
                        if (count)
                            importables.push({
                                title: h,
                                count,
                                priceData,
                                // _p,
                            });
                    });

                    return {
                        importables,
                        doorImg: product?.door?.img,
                        id: product.id,
                        title: product.door?.title,
                        pricings,
                    };
                })
                .filter((a) => a.importables[0]?.count),
        );
    }, []);
    async function importPrice(data) {
        await updateDoorMetaAction(prod.door.id, {
            ...(prod.door.meta || {}),
            doorPrice: data.priceData,
        });
        setStepProducts((current) => {
            let index = current.findIndex((a) => a.id == prod.id);
            return [...current].map((p, i) => {
                if (i == index) {
                    p.door.meta.doorPrice = data.priceData;
                    p.product.meta.doorPrice = data.priceData;
                }
                return p;
            });
        });
    }
    return (
        <React.Fragment>
            <MenuItem
                Icon={Icons.copy}
                // onClick={() => {
                //     modal.open();
                // }}
                SubMenu={
                    <>
                        <DropdownMenuLabel>Select Door</DropdownMenuLabel>
                        <ScrollArea className="h-[40vh]">
                            {prods.map((p, i) => (
                                <MenuItem
                                    key={i}
                                    SubMenu={
                                        <>
                                            <DropdownMenuLabel>
                                                Size
                                            </DropdownMenuLabel>
                                            <div className="flex">
                                                <div className="w-36">
                                                    {p.importables.map((i) => (
                                                        <MenuItem
                                                            onClick={() =>
                                                                importPrice(i)
                                                            }
                                                            className="flex justify-between"
                                                            key={i.title}
                                                        >
                                                            <span>
                                                                {i.title}
                                                            </span>
                                                            <span className="inline-flex items-center space-x-1 text-xs font-bold">
                                                                <Icons.dollar className="h-3 w-3" />
                                                                <span>
                                                                    {i.count}
                                                                </span>
                                                            </span>
                                                        </MenuItem>
                                                    ))}
                                                </div>
                                                <div
                                                    className={cn(
                                                        "h-48 w-48",
                                                        !p.doorImg && "hidden",
                                                    )}
                                                >
                                                    <ProductImage
                                                        aspectRatio={4 / 4}
                                                        item={{
                                                            product: {
                                                                img: p.doorImg,
                                                            },
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    }
                                >
                                    {p.title}
                                </MenuItem>
                            ))}
                        </ScrollArea>
                        {/* <MenuItem
                            SubMenu={
                                <>
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel>
                                            Label
                                        </DropdownMenuLabel>
                                    </DropdownMenuGroup>
                                    <MenuItem>All Sizes</MenuItem>
                                    <MenuItem>8-0</MenuItem>
                                </>
                            }
                        >
                            Door 1
                        </MenuItem> */}
                    </>
                }
            >
                Copy Price
            </MenuItem>
        </React.Fragment>
    );
}
