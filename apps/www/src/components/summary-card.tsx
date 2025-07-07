"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";

import { AnimatedNumber } from "./animated-number";

export function SummaryCardSkeleton() {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle>
                    <Skeleton className="h-8 w-32" />
                </CardTitle>
            </CardHeader>

            <CardContent>
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </CardContent>
        </Card>
    );
}

interface Props {
    title?: string;
    currency?;
    total_amount?;
    subtitle?;
}
export function SummaryCard(props: Props) {
    const [activeIndex, setActiveIndex] = useState(0);

    //   const dataWithDefaultCurrency = data.length
    //     ? data
    //     : [{ currency: defaultCurrency, total_amount: 0 }];

    //   const item = dataWithDefaultCurrency[activeIndex];

    return (
        <Card>
            <CardHeader className="relative pb-2">
                <CardTitle className="font-mono text-2xl font-medium">
                    <AnimatedNumber
                        key={props.currency}
                        value={props.total_amount}
                        currency={props.currency}
                        maximumFractionDigits={0}
                        minimumFractionDigits={0}
                    />

                    {/* {dataWithDefaultCurrency.length > 1 && (
            <div className="flex space-x-2 top-[63px] absolute">
              {dataWithDefaultCurrency.map((item, idx) => (
                <button
                  type="button"
                  key={item.currency}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    "w-[10px] h-[3px] bg-[#1D1D1D] dark:bg-[#D9D9D9] opacity-30 transition-all",
                    idx === activeIndex && "opacity-100",
                  )}
                />
              ))}
            </div>
          )} */}
                </CardTitle>
            </CardHeader>

            <CardContent>
                <div className="flex flex-col gap-2">
                    <div>{props.title}</div>
                    <div className="text-sm text-muted-foreground">
                        {props.subtitle}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
