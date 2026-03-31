import { format } from "date-fns";
import { formatDateRange } from "little-date";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import { isSearchKey } from "./search-utils";
import { PageFilterData } from "@gnd/utils/types";

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
  const activeEntries = Object.entries(filters || {}).filter(([key, value]) => {
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });
  const renderFilter = ({ key, value }) => {
    switch (key) {
      case "start": {
        if (key === "start" && value && filters.end) {
          return formatDateRange(new Date(value), new Date(filters.end), {
            includeTime: false,
          });
        }

        return (
          key === "start" && value && format(new Date(value), "MMM d, yyyy")
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
        const filter = filterList?.find((f) => f?.value === key);
        const opts = filter?.options;
        if (!opts) return String(value);
        if (!Array.isArray(value)) {
          return opts?.find((a) => a?.value == value)?.label || String(value);
        }
        return (value || [])
          ?.map((v) => opts?.find((a) => a?.value == v)?.label || v)
          ?.join(", ");
    }
  };
  return (
    <div className="flex items-center">
      <div className="" id="filterSlot"></div>
      <ul className="flex space-x-2 items-center">
        {loading && (
          <div className="flex space-x-2">
            <li key="1">
              <Skeleton className="h-8 w-[100px] rounded-full" />
            </li>
            <li key="2">
              <Skeleton className="h-8 w-[100px] rounded-full" />
            </li>
          </div>
        )}
        {/* {!loading && filterList.map(f => )} */}

        {!loading &&
          activeEntries
            .filter(([key]) => key !== "end")
            .map(([key, value]) => {
              const f = filterList.find((f) => f.value === key);
              return (
                <li key={key}>
                  <Button
                    className="h-9 px-2 bg-secondary hover:bg-secondary font-normal text-[#878787] flex space-x-1 items-center group rounded-none"
                    onClick={() => handleOnRemove(key)}
                  >
                    <Icons.Clear className="scale-0 group-hover:scale-100 transition-all w-0 group-hover:w-4" />
                    <span>
                      {f?.type == "date-range" ? (
                        <div className="inline-flex gap-1">
                          {(value as any)
                            // ?.split(",")
                            .map((a, ai) => (
                              <span key={ai} className="">
                                {a}
                                {ai == 0 ? " - " : ""}
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
                </li>
              );
            })}
        {!loading && activeEntries.length > 0 && (
          <li key="clear-all">
            <Button
              className="h-9 px-2 bg-secondary hover:bg-secondary font-normal text-[#878787] flex items-center group rounded-none"
              onClick={onClearAll}
            >
              Clear filters
            </Button>
          </li>
        )}
      </ul>
    </div>
  );
}
