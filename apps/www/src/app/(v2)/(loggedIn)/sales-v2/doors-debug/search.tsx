"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";

export default function Search() {
    const form = useForm({
        defaultValues: {
            q: "",
            omit: "",
        },
    });
    const searchParams = useSearchParams();
    const q = form.watch("q");
    const omit = form.watch("omit");
    const router = useRouter();
    const createQueryString = React.useCallback(
        (params: Record<string, string | number | null>) => {
            const newSearchParams = new URLSearchParams(
                searchParams?.toString(),
            );

            for (const [key, value] of Object.entries(params)) {
                if (value === null) {
                    newSearchParams.delete(key);
                } else {
                    newSearchParams.set(key, String(value));
                }
            }

            return newSearchParams.toString();
        },
        [searchParams],
    );
    const pathname = usePathname();
    useEffect(() => {
        router.push(
            `${pathname}?${createQueryString({
                q,
                omit,
            })}`,
        );
    }, [q, omit]);

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label>Query</Label>
                <Input {...form.register("q")} />
            </div>
            <div className="grid gap-2">
                <Label>Omit</Label>
                <Input {...form.register("omit")} />
            </div>
        </div>
    );
}
