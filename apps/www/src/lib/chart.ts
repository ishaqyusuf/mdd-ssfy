import dayjs from "dayjs";
import { toFixed } from "./use-number";

export interface BarChartProps {
    month;
    current;
    previous;
}
export function composeBar(_charts: { year; month; value }[]) {
    let total = 12;
    const charts = _charts; //.splice(-12);
    // const {year,month} = charts[0]

    // const date = dayjs();
    let _chart: BarChartProps[] = [];
    // console.log({ _charts });

    // const lastYear =
    for (let i = 0; i < 12; i++) {
        let _d = dayjs().subtract(i, "months");
        const month = _d?.format("M");
        const year = _d?.format("YYYY");

        const lastYear = String(Number(year) - 1);
        const monthChats = charts.filter((c) => c.month == month);

        const _c = {
            month: _d.format("MMM"),
            current: +toFixed(
                monthChats.find((v) => v.year == year)?.value || 0
            ),
            previous: +toFixed(
                monthChats.find((v) => v.year == lastYear)?.value || 0
            ),
        };

        _chart.unshift(_c);
    }
    return _chart;
}
