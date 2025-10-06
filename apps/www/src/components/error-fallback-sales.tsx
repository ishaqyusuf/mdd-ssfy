"use client";

import { useRouter } from "next/navigation";

import { Button } from "@gnd/ui/button";
import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { useEffect } from "react";
import { generateRandomString } from "@gnd/utils";

export function ErrorFallbackSales() {
    const router = useRouter();
    const { setFilters } = useOrderFilterParams();
    useEffect(() => {
        setTimeout(() => {
            setFilters({
                erf: generateRandomString(),
            });
        }, 2000);
    }, []);
    return (
        <div className="flex h-full flex-col items-center justify-center space-y-4">
            <div>
                <h2 className="text-md">Something went wrong</h2>
            </div>
            <Button onClick={() => router.refresh()} variant="outline">
                Try again
            </Button>
        </div>
    );
}
