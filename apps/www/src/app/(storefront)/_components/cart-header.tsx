"use client";

import Money from "@/components/_v1/money";
import { ShoppingCart } from "lucide-react";

import { Badge } from "@gnd/ui/badge";

export default function CartHeader() {
    return (
        <div className="inline-flex items-center space-x-1">
            <Badge variant="destructive" className="px-1.5">
                0
            </Badge>
            <ShoppingCart />
            <Money value={0} />
        </div>
    );
}
