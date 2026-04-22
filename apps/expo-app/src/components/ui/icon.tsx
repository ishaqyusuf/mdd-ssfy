import { cn } from "@/lib/utils";
import { HugeiconsIcon, type HugeiconsProps } from "@hugeicons/react-native";
import * as HugeIcons from "@hugeicons/core-free-icons";
import { useColorScheme } from "@/hooks/use-color";
import { camel } from "@gnd/utils";
import { THEME } from "@/lib/theme";
import { View } from "react-native";
import type { ComponentType } from "react";

export type LucideProps = Omit<HugeiconsProps, "icon" | "altIcon" | "showAlt">;
export type IconProps = LucideProps & {
  name?: IconKeys;
};
type LucideIcon = ComponentType<LucideProps>;
type HugeIconName = keyof typeof HugeIcons;

function hugeIcon(name: HugeIconName): LucideIcon {
  const icon = HugeIcons[name] as any;

  return function HugeIconComponent({
    strokeWidth = 1.8,
    size = 24,
    ...props
  }: LucideProps) {
    const resolvedIcon = icon ?? (HugeIcons.X as any);

    if (__DEV__ && !icon) {
      console.warn(`[Icon] Missing Hugeicon export for "${name}", falling back to X.`);
    }

    return (
      <HugeiconsIcon
        icon={resolvedIcon}
        size={size}
        strokeWidth={strokeWidth}
        {...props}
      />
    );
  };
}

const Activity = hugeIcon("Activity");
const AlertCircle = hugeIcon("AlertCircle");
const AppWindow = hugeIcon("ComputerIcon");
const ArrowLeft = hugeIcon("ArrowLeft");
const ArrowRight = hugeIcon("ArrowRight");
const BarChart2 = hugeIcon("Analytics01Icon");
const BarChart3 = hugeIcon("AnalyticsUpIcon");
const Bell = hugeIcon("Bell");
const Briefcase = hugeIcon("Briefcase");
const Building = hugeIcon("Building");
const Building2 = hugeIcon("Building02Icon");
const Calendar = hugeIcon("Calendar");
const CalendarCheck = hugeIcon("CalendarCheckIn01Icon");
const Camera = hugeIcon("Camera");
const ChartNoAxesColumn = hugeIcon("Analytics01Icon");
const Check = hugeIcon("Check");
const CheckCircle2 = hugeIcon("CheckmarkCircle01Icon");
const CheckSquare = hugeIcon("CheckmarkSquare01Icon");
const ChevronDown = hugeIcon("ArrowDown01Icon");
const ChevronLeft = hugeIcon("ArrowLeft01Icon");
const ChevronRight = hugeIcon("ArrowRight01Icon");
const CircleCheck = hugeIcon("CircleCheck");
const CircleDollarSign = hugeIcon("DollarCircleIcon");
const ClipboardCheck = hugeIcon("ClipboardCheck");
const ClipboardList = hugeIcon("ClipboardList");
const Clock = hugeIcon("Clock");
const CreditCard = hugeIcon("CreditCard");
const Delete = hugeIcon("Delete");
const DoorOpen = hugeIcon("Door01Icon");
const Fence = hugeIcon("FenceIcon");
const FilePenLine = hugeIcon("FileEditIcon");
const FileText = hugeIcon("File02Icon");
const FolderPlus = hugeIcon("FolderAddIcon");
const Gavel = hugeIcon("JudgeIcon");
const Globe = hugeIcon("Globe");
const GripHorizontal = hugeIcon("DragDropHorizontalIcon");
const HardHat = hugeIcon("ConstructionIcon");
const Hash = hugeIcon("Hash");
const HelpCircle = hugeIcon("HelpCircleIcon");
const Hourglass = hugeIcon("Hourglass");
const House = hugeIcon("House");
const Info = hugeIcon("Info");
const LayoutDashboard = hugeIcon("LayoutDashboard");
const LayoutGrid = hugeIcon("LayoutGrid");
const List = hugeIcon("List");
const ListChecks = hugeIcon("CheckListIcon");
const ListX = hugeIcon("ListViewIcon");
const Loader2 = hugeIcon("Loading03Icon");
const LocateIcon = hugeIcon("Location01Icon");
const Lock = hugeIcon("Lock");
const LogOut = hugeIcon("Logout01Icon");
const Mail = hugeIcon("Mail");
const MapPin = hugeIcon("MapPin");
const Minus = hugeIcon("Minus");
const MoreHorizontal = hugeIcon("MoreHorizontal");
const Pencil = hugeIcon("Pencil");
const Phone = hugeIcon("Phone");
const PieChart = hugeIcon("PieChart");
const Pin = hugeIcon("Pin");
const Plus = hugeIcon("Plus");
const PlusCircle = hugeIcon("PlusSignCircleIcon");
const Receipt = hugeIcon("Receipt");
const ReceiptText = hugeIcon("ReceiptTextIcon");
const Search = hugeIcon("Search");
const Settings = hugeIcon("Settings");
const Share = hugeIcon("Share");
const ShieldCheck = hugeIcon("SecurityCheckIcon");
const SlidersHorizontal = hugeIcon("FilterHorizontalIcon");
const StickyNote = hugeIcon("StickyNote");
const Trash = hugeIcon("Trash");
const TrendingDown = hugeIcon("AnalyticsDownIcon");
const TrendingUp = hugeIcon("AnalyticsUpIcon");
const TriangleAlert = hugeIcon("AlertTriangle");
const Truck = hugeIcon("Truck");
const User = hugeIcon("User");
const UserCog = hugeIcon("UserCog");
const UserPlus = hugeIcon("UserPlus");
const Users = hugeIcon("Users");
const UserX = hugeIcon("UserX");
const Warehouse = hugeIcon("Warehouse");
const Wallet = hugeIcon("Wallet");
const Wind = hugeIcon("Wind");
const Wrench = hugeIcon("Wrench");
const X = hugeIcon("X");
const XCircle = hugeIcon("XCircle");
const Zap = hugeIcon("Zap");
const Route = hugeIcon("RouteIcon");
const Ban = hugeIcon("CancelSquareIcon");
// type T = IconProps['strokeWidth']
const iconSizes = {
  xs: 12,
  sm: 16,
  base: 20,
  md: 24,
  lg: 28,
  xl: 32,
  "2xl": 40,
};
// type T = IconProps['strokeWidth']
function IconImpl({ name, ...props }: IconProps) {
  let IconComponent;
  const { colorScheme } = useColorScheme();
  const className = typeof props.className === "string" ? props.className : "";
  const textClass = className
    .split(" ")
    ?.reverse()
    ?.find((a) => a?.startsWith("text-"));
  const textToken = textClass?.slice(5);
  const [colorToken, opacityToken] = (textToken || "").split("/");
  let color: string | undefined;
  try {
    color = colorToken ? camel(colorToken.split("-").join(" ")) : undefined;
  } catch {
    color = undefined;
  }
  const parsedOpacity = opacityToken ? Number(opacityToken) : undefined;
  const opacity =
    parsedOpacity === undefined || Number.isNaN(parsedOpacity)
      ? undefined
      : parsedOpacity > 1
        ? parsedOpacity / 100
        : parsedOpacity;

  const themedColor =
    color && colorScheme === "dark"
      ? THEME.dark[color]
      : color
        ? THEME.light[color]
        : undefined;
  const resolvedColor = themedColor || color || props.color;
  const styleFromClass = {
    color: resolvedColor,
    ...(opacity !== undefined ? { opacity } : {}),
  };
  props.color = resolvedColor;
  props.style = props.style
    ? ([props.style, styleFromClass] as any)
    : (styleFromClass as any);

  let sizestr = className
    .split(" ")
    ?.find((a) => a.startsWith("size-"))
    ?.split("-")?.[1]!;
  if (sizestr?.startsWith("[")) {
    sizestr = sizestr.replace(/[\[\]px]/g, "");
  }
  sizestr = iconSizes[sizestr] || sizestr || iconSizes?.base;

  props.size = +sizestr || props.size;
  if (!IconComponent) IconComponent = appIcons[name!] || appIcons.X;
  const otherClasses = className
    .split(" ")
    .filter((a) => ["size-", "text-"].every((b) => !a?.startsWith(b)));
  if (otherClasses?.length)
    return (
      <View className={cn(otherClasses.join(" "))}>
        <IconComponent {...props} />
      </View>
    );
  return <IconComponent {...props} />;
}

function IconRoot({
  // as: IconComponent,
  className,
  size = "size-base",

  ...props
}: IconProps) {
  return (
    <IconImpl
      // as={IconComponent}
      className={cn("text-foreground", className)}
      size={size}
      {...props}
    />
  );
}
// function camel(str?: string) {
//   if (!str) return str;
//   return str.replace(
//     /^([A-Z])|\s(\w)/g,
//     function (match: any, p1: any, p2: any, offset: any) {
//       if (p2) return p2.toUpperCase();
//       return p1.toLowerCase();
//     }
//   );
// }

const appIcons = {
  AppWindow,
  Activity,
  analytics: BarChart2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Ban,
  BarChart3,
  Bell,
  Briefcase,
  Building,
  Building2,
  Calendar,
  CalendarCheck,
  Camera,
  Check,
  CheckSquare,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  CircleCheck,
  CircleDollarSign,
  CreditCard,
  Delete,
  DoorOpen,
  Fence,
  FilePenLine,
  FileText,
  FolderPlus,
  Gavel,
  Globe,
  GripHorizontal,
  HardHat,
  Hash,
  HelpCircle,
  home: LayoutDashboard,
  Hourglass,
  House,

  Info,
  jobs: Briefcase,
  LayoutDashboard,
  LayoutGrid,
  List,
  ListChecks,
  ListX,
  LocateIcon,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Minus,
  more: MoreHorizontal,

  Pencil,
  Phone,
  PieChart,
  Pin,
  Plus,
  PlusCircle,
  Receipt,
  ReceiptText,
  Route,
  Search,
  settings: Settings,
  Settings,
  Share,
  ShieldCheck,
  SlidersHorizontal,
  StickyNote,
  Trash,
  TrendingUp,
  TrendingDown,
  TriangleAlert,
  UserCog,
  UserPlus,
  Users,
  User,
  UserX,
  Warehouse,
  Wallet,
  Wind,
  Wrench,
  X,
  XCircle,
  Zap,
  ChartNoAxesColumn,
  Truck,
};
export type IconKeys = keyof typeof appIcons;
export const Icon = Object.assign(IconRoot, appIcons);
