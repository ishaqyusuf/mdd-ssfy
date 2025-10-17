import { isSameDay } from "date-fns";
// import { type ColumnSchema } from "../schema";
import type { SearchParamsType } from "./search-params";
import {
    isArrayOfBooleans,
    isArrayOfDates,
    isArrayOfNumbers,
} from "@/lib/is-array";
import {
    calculatePercentile,
    calculateSpecificPercentile,
} from "@/lib/request/percentile";
// import { REGIONS } from "@/constants/region";

export function filterData<T>(data: T[], search: Partial<SearchParamsType>) {
    const { start, size, sort, ...filters } = search;
    return data.filter((row) => {
        for (const key in filters) {
            const filter: any = filters[key as keyof typeof filters];
            if (filter === undefined || filter === null) continue;
            if (
                (key === "latency" ||
                    key === "timing.dns" ||
                    key === "timing.connection" ||
                    key === "timing.tls" ||
                    key === "timing.ttfb" ||
                    key === "timing.transfer") &&
                isArrayOfNumbers(filter)
            ) {
                if (filter.length === 1 && row[key] !== filter[0]) {
                    return false;
                } else if (
                    filter.length === 2 &&
                    (row[key] < filter[0] || row[key] > filter[1])
                ) {
                    return false;
                }
                return true;
            }
            if (key === "status" && isArrayOfNumbers(filter)) {
                if (!filter.includes(row[key])) {
                    return false;
                }
            }
            if (key === "regions" && Array.isArray(filter)) {
                // const typedFilter = filter as unknown as typeof REGIONS;
                // if (!typedFilter.includes(row[key]?.[0])) {
                //     return false;
                // }
            }
            if (key === "date" && isArrayOfDates(filter)) {
                if (filter.length === 1 && !isSameDay(row[key], filter[0])) {
                    return false;
                } else if (
                    filter.length === 2 &&
                    (row[key].getTime() < filter[0].getTime() ||
                        row[key].getTime() > filter[1].getTime())
                ) {
                    return false;
                }
            }
            if (key === "success" && isArrayOfBooleans(filter)) {
                if (!filter.includes(row[key])) {
                    return false;
                }
            }
        }
        return true;
    });
}

export function sortData<T>(data: T[], sort: SearchParamsType["sort"]) {
    if (!sort) return data;
    return data.sort((a, b) => {
        if (sort.desc) {
            // @ts-ignore
            return a?.[sort.id] < b?.[sort.id] ? 1 : -1;
        } else {
            // @ts-ignore
            return a?.[sort.id] > b?.[sort.id] ? 1 : -1;
        }
    });
}

// TODO: later on, we could hover over the percentile to get a concrete value for the p50, p75, p90, p95, p99
// for better comparability
export function percentileData<T>(data: T[]) {
    return data;
    // const latencies = data.map((row) => row.latency);
    // return data.map((row) => ({
    //     ...row,
    //     percentile: calculatePercentile(latencies, row.latency),
    // }));
}

export function getPercentileFromData<T>(data: T[]) {
    const latencies = data.map((row) => (row as any).latency);

    const p50 = calculateSpecificPercentile(latencies, 50);
    const p75 = calculateSpecificPercentile(latencies, 75);
    const p90 = calculateSpecificPercentile(latencies, 90);
    const p95 = calculateSpecificPercentile(latencies, 95);
    const p99 = calculateSpecificPercentile(latencies, 99);

    return { p50, p75, p90, p95, p99 };
}

export function dataResponse<T>(filteredData: T[], search) {
    // const filteredData = filterData(totalData, search);
    const sortedData = sortData(filteredData, search.sort);
    const withPercentileData = percentileData(sortedData);
    const latencies = (withPercentileData as any).map(({ latency }) => latency);
    const currentPercentiles = {
        50: calculateSpecificPercentile(latencies, 50),
        75: calculateSpecificPercentile(latencies, 75),
        90: calculateSpecificPercentile(latencies, 90),
        95: calculateSpecificPercentile(latencies, 95),
        99: calculateSpecificPercentile(latencies, 99),
    };
    return {
        data: filterData,
    };
}
