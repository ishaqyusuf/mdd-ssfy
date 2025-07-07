"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { useEffect, useState } from "react";
import { Icons } from "./icons";
import LinkableNode from "./link-node";

interface Props {
    children?;
}
export function StatCardContainer({ children }: Props) {
    return (
        <div className="grid  gap-4 md:grid-cols-2 lg:grid-cols-4">
            {children}
        </div>
    );
}
interface StatCardProps {
    label: string;
    info?;
    money?: Boolean;
    icon?: keyof typeof Icons;
    value;
    href?;
    className?;
    masked?: Boolean;
}
export function StartCard({
    label,
    masked,
    className,
    value,
    href,
    money,
    icon,
    info,
}: StatCardProps) {
    let Icon: any = Icons[icon as any];

    //   Icons
    const [isMasked, setIsMasked] = useState(masked);
    const [displayValue, setDisplayValue] = useState("");
    useEffect(() => {
        // {money ? formatCurrency.format(value) : value}
        if (!money) setDisplayValue(value);
        else {
            //
            if (masked && isMasked) setDisplayValue(maskedValue());
            else setDisplayValue(unmaskedValue());
        }
    }, [money, value, isMasked, masked]);

    function unmaskedValue() {
        return formatCurrency.format(value || 0);
    }
    function maskedValue() {
        return unmaskedValue().replace(/\d/g, "*");
    }
    return (
        <LinkableNode href={href}>
            <Card className={cn("py-2 h-full", className)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-0">
                    <CardTitle className="text-sm font-medium">
                        {label}
                    </CardTitle>
                    <div>
                        {Icon && (
                            <Icon className="h-4 w-4 text-muted-foreground" />
                        )}
                    </div>
                    {/* <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          className="h-4 w-4 text-muted-foreground"
        >
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg> */}
                </CardHeader>
                <CardContent className="pb-0">
                    <div
                        onClick={() => {
                            setIsMasked(!isMasked);
                        }}
                        className={cn(
                            "text-2xl font-bold",
                            masked && isMasked && "tracking-wider",
                            masked && "cursor-pointer",
                        )}
                    >
                        {displayValue}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {/* +20.1% from last month */}
                        {info}
                    </p>
                </CardContent>
            </Card>
        </LinkableNode>
    );
}
