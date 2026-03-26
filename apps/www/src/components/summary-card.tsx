"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { useState } from "react";

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
	masked?: boolean;
}
export function SummaryCard(props: Props) {
	const [activeIndex, setActiveIndex] = useState(0);
	const [isMasked, setIsMasked] = useState(Boolean(props.masked));

	//   const dataWithDefaultCurrency = data.length
	//     ? data
	//     : [{ currency: defaultCurrency, total_amount: 0 }];

	//   const item = dataWithDefaultCurrency[activeIndex];
	function getDisplayValue() {
		if (props.currency === "number") {
			return String(props.total_amount ?? 0);
		}
		return formatCurrency.format(props.total_amount || 0);
	}

	const maskedValue = getDisplayValue().replace(/\d/g, "*");

	return (
		<Card>
			<CardHeader className="relative pb-2">
				<CardTitle className="font-mono$ text-2xl font-medium">
					<button
						type="button"
						onClick={() => props.masked && setIsMasked((prev) => !prev)}
						className={cn(
							"text-left",
							props.masked && "cursor-pointer",
							props.masked && isMasked && "tracking-wider",
						)}
					>
						{props.masked && isMasked ? (
							maskedValue
						) : (
							<AnimatedNumber
								key={props.currency}
								value={props.total_amount}
								currency={props.currency}
								maximumFractionDigits={0}
								minimumFractionDigits={0}
							/>
						)}
					</button>

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
					<div className="text-sm text-muted-foreground">{props.subtitle}</div>
				</div>
			</CardContent>
		</Card>
	);
}
