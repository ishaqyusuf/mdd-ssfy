"use client";
import { OrderSearchFilter } from "./sales-order-search-filter";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { useOrderFilterParams } from "@/hooks/use-sales-filter-params";
import { Icons } from "@gnd/ui/custom/icons";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@gnd/ui/use-toast";
import dayjs from "dayjs";
import { utils, writeFile } from "xlsx";
import { formatDate } from "@gnd/utils/dayjs";
import { formatMoney } from "@gnd/utils";
import { env } from "@/env.mjs";
import { useSalesOrdersStore } from "@/store/sales-orders";
import { useMemo } from "react";
import { SalesOrderExport } from "./sales-order-export";

export function OrderHeader({}) {
    return (
        <div className="flex gap-4">
            <OrderSearchFilter />
            <div className="flex-1"></div>

            <SalesOrderExport />
            <Button asChild size="sm">
                <Link href="/sales-book/create-order">
                    <Icons.add className="mr-2 size-4" />
                    <span>New</span>
                </Link>
            </Button>
        </div>
    );
}

