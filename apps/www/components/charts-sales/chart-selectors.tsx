import { Cookies } from "@/utils/constants";
import { cookies } from "next/headers";
import { ChartType } from "./chart-type";

export async function ChartSelectors({ defaultValue }) {
    const chartType =
        (await cookies()).get(Cookies.SalesChartType)?.value ?? "sales";

    return (
        <div className="flex justify-between mt-6 space-x-2">
            <div className="flex space-x-2">
                <ChartType initialValue={chartType} />
            </div>
        </div>
    );
}
