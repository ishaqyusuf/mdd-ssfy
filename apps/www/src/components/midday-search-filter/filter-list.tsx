import { format } from "date-fns";
import { motion } from "framer-motion";
import { formatDateRange } from "little-date";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import { isSearchKey } from "./search-utils";
import { PageFilterData } from "@api/type";

const listVariant = {
    hidden: { y: 10, opacity: 0 },
    show: {
        y: 0,
        opacity: 1,
        transition: {
            duration: 0.05,
            staggerChildren: 0.06,
        },
    },
};

const itemVariant = {
    hidden: { y: 10, opacity: 0 },
    show: { y: 0, opacity: 1 },
};
interface Props {
    loading?: boolean;
    filterList: PageFilterData[];
    filters;
    onRemove?;
    onClearAll?;
}
export function FilterList({
    loading,
    filterList,
    filters,
    onRemove,
    onClearAll,
}: Props) {
    const handleOnRemove = (key: string) => {
        if (key === "start" || key === "end") {
            onRemove({ start: null, end: null });
            return;
        }

        onRemove({ [key]: null });
    };
    const renderFilter = ({ key, value }) => {
        switch (key) {
            case "start": {
                if (key === "start" && value && filters.end) {
                    return formatDateRange(
                        new Date(value),
                        new Date(filters.end),
                        {
                            includeTime: false,
                        },
                    );
                }

                return (
                    key === "start" &&
                    value &&
                    format(new Date(value), "MMM d, yyyy")
                );
            }

            //  case "amount_range": {
            //      return `${amountRange?.[0]} - ${amountRange?.[1]}`;
            //  }

            //  case "attachments": {
            //      return attachmentsFilters?.find(
            //          (filter) => filter.id === value,
            //      )?.name;
            //  }

            //  case "recurring": {
            //      return value
            //          ?.map(
            //              (slug) =>
            //                  recurringFilters?.find(
            //                      (filter) => filter.id === slug,
            //                  )?.name,
            //          )
            //          .join(", ");
            //  }

            //  case "statuses": {
            //      return value
            //          .map(
            //              (status) =>
            //                  statusFilters.find(
            //                      (filter) => filter.id === status,
            //                  )?.name,
            //          )
            //          .join(", ");
            //  }

            //  case "categories": {
            //      return value
            //          .map(
            //              (slug) =>
            //                  categories?.find(
            //                      (category) => category.slug === slug,
            //                  )?.name,
            //          )
            //          .join(", ");
            //  }

            //  case "tags": {
            //      return value
            //          .map(
            //              (id) =>
            //                  tags?.find(
            //                      (tag) => tag?.id === id || tag?.slug === id,
            //                  )?.name,
            //          )
            //          .join(", ");
            //  }

            //  case "accounts": {
            //      return value
            //          .map((id) => {
            //              const account = accounts?.find(
            //                  (account) => account.id === id,
            //              );
            //              return formatAccountName({
            //                  name: account?.name,
            //                  currency: account?.currency,
            //              });
            //          })
            //          .join(", ");
            //  }

            //  case "customers": {
            //      return value
            //          .map(
            //              (id) =>
            //                  customers?.find((customer) => customer.id === id)
            //                      ?.name,
            //          )
            //          .join(", ");
            //  }

            //  case "assignees":
            //  case "owners": {
            //      return value
            //          .map((id) => {
            //              const member = members?.find(
            //                  (member) => member.id === id,
            //              );
            //              return member?.name;
            //          })
            //          .join(", ");
            //  }

            default:
                if (isSearchKey(key)) return value;
                const opts = filterList?.find((f) => f?.value === key)?.options;
                if (!opts) return null;
                if (!Array.isArray(value)) {
                    return (
                        opts?.find((a) => String(a?.value) === String(value))
                            ?.label || value
                    );
                }
                return (value || [])
                    ?.map((v) => opts?.find((a) => a?.value == v)?.label || v)
                    ?.join(", ");
        }
    };
    const activeEntries = Object.entries(filters || {}).filter(([key, value]) => {
        if (value === null || value === undefined || value === "") return false;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    });
    const visibleEntries = activeEntries.filter(([key]) => key !== "end");
    return (
        <div className="w-full min-w-0 overflow-x-auto pb-1">
            <motion.ul
                variants={listVariant}
                initial="hidden"
                animate="show" //@ts-ignore
                className="flex w-max min-w-full gap-2 lg:min-w-0 lg:flex-wrap"
            >
                {loading && (
                    <div className="flex gap-2">
                        <motion.li key="1" variants={itemVariant}>
                            <Skeleton className="h-8 w-[100px] rounded-full" />
                        </motion.li>
                        <motion.li key="2" variants={itemVariant}>
                            <Skeleton className="h-8 w-[100px] rounded-full" />
                        </motion.li>
                    </div>
                )}
                {/* {!loading && filterList.map(f => )} */}

                {!loading &&
                    visibleEntries.map(([key, value]) => {
                        const f = filterList.find((f) => f.value === key);
                        return (
                            <motion.li key={key} variants={itemVariant}>
                                <Button
                                    className="group flex h-8 shrink-0 items-center space-x-1 rounded-full bg-secondary px-3 font-normal text-[#878787] hover:bg-secondary"
                                    onClick={() => handleOnRemove(key)}
                                >
                                    <Icons.Clear className="w-0 scale-0 transition-all group-hover:w-4 group-hover:scale-100" />
                                    <span>
                                        {f?.type == "date-range" ? (
                                            <div className="inline-flex gap-1">
                                                {(value as any)
                                                    // ?.split(",")
                                                    .map((a, ai) => (
                                                        <span
                                                            key={ai}
                                                            className=""
                                                        >
                                                            {a}
                                                            {ai == 0
                                                                ? " - "
                                                                : ""}
                                                        </span>
                                                    ))}
                                            </div>
                                        ) : (
                                            renderFilter({
                                                key,
                                                value,
                                            })
                                        )}
                                    </span>
                                </Button>
                            </motion.li>
                        );
                    })}
                {!loading && visibleEntries.length > 0 && (
                    <motion.li key="clear-all" variants={itemVariant}>
                        <Button
                            className="flex h-8 shrink-0 items-center rounded-full bg-secondary px-3 font-normal text-[#878787] hover:bg-secondary"
                            onClick={onClearAll}
                        >
                            Clear filters
                        </Button>
                    </motion.li>
                )}
            </motion.ul>
        </div>
    );
}
