"use client";

import Link from "next/link";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import { cn } from "@/lib/utils";

import { Badge } from "@gnd/ui/badge";
import { buttonVariants } from "@gnd/ui/button";
import { Separator } from "@gnd/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@gnd/ui/sheet";

export function CartSheet() {
    const cartLineItems = [] as any; //await getCart();

    const itemCount = cartLineItems.reduce(
        (total, item) => total + Number(item.quantity),
        0,
    );

    const cartTotal = cartLineItems.reduce(
        (total, item) => total + item.quantity * Number(item.price),
        0,
    );
    return (
        <Sheet>
            <SheetTrigger asChild>
                <button className="inline-flex items-center space-x-1">
                    <Badge variant="destructive" className="px-1.5">
                        0
                    </Badge>
                    <Icons.cart />
                    <Money value={0} />
                </button>
                {/* <Button
                    aria-label="Open cart"
                    variant="outline"
                    size="icon"
                    className="relative"
                >
                    {itemCount > 0 && (
                        <Badge
                            variant="secondary"
                            className="absolute -right-2 -top-2 size-6 justify-center rounded-full p-2.5"
                        >
                            {itemCount}
                        </Badge>
                    )}
                    <Icons.cart className="size-4" aria-hidden="true" />
                </Button> */}
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg">
                <SheetHeader className="space-y-2.5 pr-6">
                    <SheetTitle>
                        Cart {itemCount > 0 && `(${itemCount})`}
                    </SheetTitle>
                    <Separator />
                </SheetHeader>
                {itemCount > 0 ? (
                    <>
                        {/* <CartLineItems
                            items={cartLineItems}
                            className="flex-1"
                        /> */}
                        <div className="space-y-4 pr-6">
                            <Separator />
                            <div className="space-y-1.5 text-sm">
                                <div className="flex">
                                    <span className="flex-1">Shipping</span>
                                    <span>Free</span>
                                </div>
                                <div className="flex">
                                    <span className="flex-1">Taxes</span>
                                    <span>Calculated at checkout</span>
                                </div>
                                <div className="flex">
                                    <span className="flex-1">Total</span>
                                    <span>
                                        {/* {formatPrice(cartTotal.toFixed(2))} */}
                                    </span>
                                </div>
                            </div>
                            <SheetFooter>
                                <SheetTrigger asChild>
                                    <Link
                                        aria-label="View your cart"
                                        href="/cart"
                                        className={buttonVariants({
                                            size: "sm",
                                            className: "w-full",
                                        })}
                                    >
                                        Continue to checkout
                                    </Link>
                                </SheetTrigger>
                            </SheetFooter>
                        </div>
                    </>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center space-y-1">
                        <Icons.cart
                            className="mb-4 size-16 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <div className="text-xl font-medium text-muted-foreground">
                            Your cart is empty
                        </div>
                        <SheetTrigger asChild>
                            <Link
                                aria-label="Add items to your cart to checkout"
                                href="/products"
                                className={cn(
                                    buttonVariants({
                                        variant: "link",
                                        size: "sm",
                                        className:
                                            "text-sm text-muted-foreground",
                                    }),
                                )}
                            >
                                Add items to your cart to checkout
                            </Link>
                        </SheetTrigger>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
