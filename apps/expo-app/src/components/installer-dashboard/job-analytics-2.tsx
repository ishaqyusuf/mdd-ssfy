import { useColorScheme } from "nativewind";
import { useQuery } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import { View } from "@/components/ui/view";
import { Text } from "../ui/text";

import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { formatMoney } from "@gnd/utils";
export function JobAnalytics2() {
  const { data } = useQuery(_trpc.jobs.earningAnalytics.queryOptions({}));
  // if(isPending || )
  const { data: graphData, earning, percentageVsLastMonth } = data || {};
  if (!graphData) return <></>;
  return (
    <View>
      <View className="px-5 mt-2">
        <View className="w-full bg-card rounded-4xl p-6 border border-border relative overflow-hidden">
          <View className="relative z-10">
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-sm font-medium text-muted-foreground">
                {"This Month's Earnings"}
              </Text>
              <View className="bg-primary/10 px-2 py-1 rounded-lg">
                <Text className="text-xs font-bold text-primary">
                  +{percentageVsLastMonth}% vs last mo.
                </Text>
              </View>
            </View>
            <Text className="text-[32px] font-bold tracking-tight text-foreground mb-6">
              ${formatMoney(earning)}
            </Text>
            <EarningsChart data={graphData} />
          </View>
        </View>
      </View>
    </View>
  );
}

// const data = [40, 12, 30, 18, 45, 10, 28, 22, 35];
const EarningsChart = ({ data }) => {
  const WIDTH = 478;
  const HEIGHT = 150;
  const isDark = false; // useColorScheme().colorScheme === "dark";
  // const isDark = useColorScheme().colorScheme === "dark";
  const strokeColor = "#2bee79"; // chart exception: fixed brand color
  const bgColor = isDark ? "#0a0a0a" : "#ffffff";
  const fillOpacityTop = isDark ? 0.35 : 0.25;
  const strokeOpacity = isDark ? 0.95 : 1;
  //   const strokePath = buildPath(data, WIDTH, HEIGHT);
  const strokePath = buildSmoothStrokePath(data, WIDTH, HEIGHT);
  //   const areaPath = buildSmoothAreaPath(data, WIDTH, HEIGHT);

  const fillPath = `${strokePath}V${HEIGHT}H0Z`;
  return (
    <View style={{ backgroundColor: bgColor }}>
      <View className="h-28 -mx-2">
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 478 150"
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient
              id="chart_gradient"
              x1="236"
              y1="1"
              x2="236"
              y2="149"
              gradientUnits="userSpaceOnUse"
            >
              {/* Using hardcoded primary color hex as per chart exception rules */}
              {/* <Stop stopColor="#2bee79" offset="0" stopOpacity="0.25" />
            <Stop stopColor="#2bee79" offset="1" stopOpacity="0" /> */}
              <Stop
                stopColor={strokeColor}
                offset="0"
                stopOpacity={fillOpacityTop}
              />
              <Stop stopColor={strokeColor} offset="1" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d={fillPath} fill="url(#chart_gradient)" />
          <Path
            d={strokePath}
            stroke={strokeColor}
            opacity={strokeOpacity}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
          {/* <Path
            d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H326.769H0V109Z"
            fill="url(#chart_gradient)"
          />
          <Path
            d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25"
            stroke="#2bee79" // Using hardcoded primary color hex as per chart exception rules
            strokeWidth="3"
            strokeLinecap="round"
          /> */}
        </Svg>
      </View>
    </View>
  );
};
// const buildSmoothAreaPath = (
//   values: number[],
//   width: number,
//   height: number
// ) => {
//   const max = Math.max(...values);
//   const min = Math.min(...values);
//   const range = max - min || 1;
//   const stepX = width / (values.length - 1);

//   const points = values.map((v, i) => ({
//     x: i * stepX,
//     y: height - ((v - min) / range) * height,
//   }));

//   let d = `M${points[0].x} ${height}`;

//   // curve up to first point
//   d += ` L${points[0].x} ${points[0].y}`;

//   for (let i = 1; i < points.length; i++) {
//     const prev = points[i - 1];
//     const curr = points[i];

//     const cx1 = prev.x + stepX / 2;
//     const cy1 = prev.y;
//     const cx2 = curr.x - stepX / 2;
//     const cy2 = curr.y;

//     d += ` C${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
//   }

//   // smooth curve back down to baseline
//   const last = points[points.length - 1];
//   d += ` C${last.x + stepX / 2} ${last.y}, ${last.x + stepX / 2} ${height}, ${
//     last.x
//   } ${height}`;

//   d += " Z";

//   return d;
// };

const buildSmoothStrokePath = (
  values: number[],
  width: number,
  height: number
) => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / range) * height,
  }));

  return points.reduce((d, p, i) => {
    if (i === 0) return `M${p.x} ${p.y}`;

    const prev = points[i - 1];
    const cx1 = prev.x + stepX / 2;
    const cx2 = p.x - stepX / 2;

    return `${d} C${cx1} ${prev.y}, ${cx2} ${p.y}, ${p.x} ${p.y}`;
  }, "");
};
