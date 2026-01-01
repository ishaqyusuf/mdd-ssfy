import { Logout } from "@/components/logout";
import { ThemeToggle } from "@/components/theme-toggle";
import { Icon, IconProps } from "@/components/ui/icon";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

// As per the rules, all components are defined in this single file.
// The component is named Home2 to match the filename.
function HomeHeader() {
  // const HomeHeader = () => (

  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: Platform.select({
          android: insets.top,
        }),
      }}
    >
      <View className="sticky top-0 z-30 bg-background px-5 py-4  flex-row items-center">
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 rounded-full bg-muted flex items-center justify-center border-2 border-card">
            <Text className="text-xl font-bold text-muted-foreground">A</Text>
          </View>
          <View>
            <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Good Morning,
            </Text>
            <Text className="text-xl font-bold leading-none text-foreground">
              Admin
            </Text>
          </View>
        </View>
        <View className="flex-1" />
        {/* <TouchableOpacity className="h-11 w-11 rounded-full bg-card border border-border flex items-center justify-center relative">
          <Icon name="Bell" className="text-foreground" size={24} />
          <View className="absolute top-3 right-3 h-2 w-2 bg-primary rounded-full border border-card" />
        </TouchableOpacity> */}
        <ThemeToggle />
        <Logout />
      </View>
    </View>
  );
}
const data = [40, 12, 30, 18, 45, 10, 28, 22, 35];

const buildPath = (values: number[], width: number, height: number) => {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const stepX = width / (values.length - 1);

  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");
};
const buildSmoothAreaPath = (
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

  let d = `M${points[0].x} ${height}`;

  // curve up to first point
  d += ` L${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const cx1 = prev.x + stepX / 2;
    const cy1 = prev.y;
    const cx2 = curr.x - stepX / 2;
    const cy2 = curr.y;

    d += ` C${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
  }

  // smooth curve back down to baseline
  const last = points[points.length - 1];
  d += ` C${last.x + stepX / 2} ${last.y}, ${last.x + stepX / 2} ${height}, ${
    last.x
  } ${height}`;

  d += " Z";

  return d;
};

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

const EarningsChart = () => {
  const WIDTH = 478;
  const HEIGHT = 150;
  const isDark = useColorScheme() === "dark";
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

const EarningsCard = () => (
  <View className="w-full bg-card rounded-4xl p-6 border border-border relative overflow-hidden">
    <View className="relative z-10">
      <View className="flex-row justify-between items-start mb-1">
        <Text className="text-sm font-medium text-muted-foreground">
          {"This Month's Earnings"}
        </Text>
        <View className="bg-primary/10 px-2 py-1 rounded-lg">
          <Text className="text-xs font-bold text-primary">
            +12% vs last mo.
          </Text>
        </View>
      </View>
      <Text className="text-[32px] font-bold tracking-tight text-foreground mb-6">
        $4,250.00
      </Text>
      <EarningsChart />
    </View>
  </View>
);

const StatusCard = ({
  icon,
  count,
  label,
  colorClass,
  iconColorClass,
}: {
  icon: IconProps["name"];
  count: string;
  label: string;
  colorClass: string;
  iconColorClass: string;
}) => (
  <View className="snap-start min-w-40 bg-card p-4 rounded-3xl border border-border flex flex-col gap-3">
    <View
      className={`h-10 w-10 rounded-full ${colorClass} flex items-center justify-center`}
    >
      <Icon name={icon} className={iconColorClass} />
    </View>
    <View>
      <Text className="text-2xl font-bold text-foreground">{count}</Text>
      <Text className="text-sm text-muted-foreground font-medium">{label}</Text>
    </View>
  </View>
);

const ActivityItem = ({
  icon,
  title,
  subtitle,
  value,
  time,
  valueColor = "text-primary",
}: {
  icon: IconProps["name"];
  title: string;
  subtitle: string;
  value: string;
  time: string;
  valueColor?: string;
}) => (
  <View className="flex-row items-center gap-4 bg-card p-3 rounded-3xl border border-border">
    <View className="h-14 w-14 rounded-2xl bg-background flex items-center justify-center shrink-0 border border-border">
      <Icon
        name={icon}
        className={
          valueColor === "text-primary" ? "text-primary" : "text-foreground"
        }
      />
    </View>
    <View className="flex-1 min-w-0">
      <Text className="text-base font-bold text-foreground" numberOfLines={1}>
        {title}
      </Text>
      <Text className="text-sm text-muted-foreground" numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
    <View className="text-right px-2">
      <Text className={`font-bold text-sm ${valueColor}`}>{value}</Text>
      <Text className="text-xs text-muted-foreground">{time}</Text>
    </View>
  </View>
);

const NavItem = ({
  icon,
  label,
  active = false,
}: {
  icon: IconProps["name"];
  label: string;
  active?: boolean;
}) => (
  <TouchableOpacity className="flex flex-col items-center gap-1">
    <Icon
      name={icon}
      className={active ? "text-primary" : "text-muted-foreground"}
    />
    <Text
      className={`text-[10px] font-bold ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const BottomNavBar = () => (
  <View className="absolute bottom-0 left-0 w-full bg-card border-t border-border pb-6 pt-3 px-8 z-40">
    <View className="flex-row justify-between items-center">
      <NavItem icon="House" label="Home" active />
      <NavItem icon="ClipboardList" label="Jobs" />
      <NavItem icon="Wallet" label="Wallet" />
      <NavItem icon="User" label="Profile" />
    </View>
  </View>
);

export default function Home2() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-background">
      <HomeHeader />
      <ScrollView contentContainerClassName="">
        <View className="px-5 mt-2">
          <EarningsCard />
        </View>

        <View className="px-5 mt-6">
          <TouchableOpacity className="w-full h-16 bg-primary rounded-full flex-row items-center justify-center gap-2">
            <Icon
              name="CirclePlus"
              className="text-primary-foreground"
              size={28}
            />
            <Text className="text-primary-foreground text-lg font-bold">
              Add New Job
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-8">
          <View className="flex-row items-center justify-between px-5 mb-4">
            <Text className="text-lg font-bold text-foreground">
              Job Status
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="px-5 pb-4 gap-3"
          >
            <StatusCard
              icon="Clock"
              count="3"
              label="Pending"
              colorClass="bg-destructive/10"
              iconColorClass="text-destructive"
            />
            <StatusCard
              icon="Wrench"
              count="5"
              label="In Progress"
              colorClass="bg-accent/10"
              iconColorClass="text-accent"
            />
            <StatusCard
              icon="CircleCheck"
              count="12"
              label="Completed"
              colorClass="bg-primary/10"
              iconColorClass="text-primary"
            />
          </ScrollView>
        </View>

        <View className="px-5 mt-4 mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">
              Recent Activity
            </Text>
            <TouchableOpacity
              onPress={(e) => {
                router.push("/jobs2");
              }}
            >
              <Text className="text-sm font-bold text-primary">View All</Text>
            </TouchableOpacity>
          </View>
          <View className="flex flex-col gap-3">
            <ActivityItem
              icon="Wallet"
              title="Payment Received"
              subtitle="Bathroom Reno - 123 Main St"
              value="+$850"
              time="2h ago"
              valueColor="text-primary"
            />
            <ActivityItem
              icon="FileText"
              title="Quote Sent"
              subtitle="Kitchen Tile - 45 Elm St"
              value="Pending"
              time="5h ago"
              valueColor="text-muted-foreground"
            />
            <ActivityItem
              icon="Calendar"
              title="Job Scheduled"
              subtitle="Deck Repair - 88 Oak Ln"
              value="Nov 14"
              time="1d ago"
              valueColor="text-accent"
            />
          </View>
        </View>
      </ScrollView>
      {/* <BottomNavBar /> */}
    </View>
  );
}
