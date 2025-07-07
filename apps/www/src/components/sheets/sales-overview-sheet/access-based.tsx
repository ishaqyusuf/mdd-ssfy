import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

interface Props {
    access?: "admin" | "non-admin";
    children?;
}
export function AccessBased({ access = "admin", children }: Props) {
    const ctx = useSalesOverviewQuery();
    if (
        (access == "admin" && ctx.assignedTo) ||
        (access == "non-admin" && !ctx.assignedTo)
    )
        return null;
    return children;
}
