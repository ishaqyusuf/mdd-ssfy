"use client";

import Link from "next/link";
import useEffectLoader from "@/lib/use-effect-loader";

import { Button } from "@gnd/ui/button";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { getContractorsPayroll } from "../action";

export default function ContractorsList({}) {
    const data = useEffectLoader(getContractorsPayroll);
    return (
        <div className="">
            <div className="">
                <ScrollArea className="f h-screen">
                    <div className="flex flex-col">
                        {data.data?.map((c) => (
                            <Button
                                variant="ghost"
                                asChild
                                disabled
                                className="flex-1"
                                key={c.id}
                            >
                                <Link href={`/contractors/payout/${c.id}`}>
                                    <span className="">{c.name}</span>
                                </Link>
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
