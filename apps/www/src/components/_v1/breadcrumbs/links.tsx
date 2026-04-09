"use client";

import { Icons } from "@gnd/ui/icons";

import { cn } from "@/lib/utils";
import Link from "@/components/link";
interface Props {
    isFirst?: boolean;
    isLast?: boolean;
    link?: string;
    title?: string;
    slug?: string;
}
export function BreadLink({ isFirst, isLast, link, title }: Props) {
    return (
        <>
            <Link
                aria-current={isLast ? "page" : undefined}
                href={link || "/"}
                className={cn(
                    "truncate transition-colors hover:text-muted-foreground",
                    isLast || !link
                        ? "pointer-events-none text-muted-foreground"
                        : "text-foreground",
                )}
            >
                {title}
            </Link>
            {!isLast && (
                <Icons.ChevronRightIcon className="mx-2 h-4 w-4" aria-hidden="true" />
            )}
        </>
    );
}

const ProductionsCrumb = (props: Props) => (
    <BreadLink {...props} title="Productions" link="/sales/productions" />
);
export const OrdersCrumb = (props: Props) => (
    <BreadLink {...props} title="Orders" link="/sales/orders" />
);
const EstimatesCrumb = (props: Props) => (
    <BreadLink {...props} title="Quotes" link="/sales/quotes" />
);
export const OrderViewCrumb = (props: Props) => (
    <BreadLink
        {...props}
        link={`/sales/order/${props.slug}`}
        title={props.slug}
    />
);
