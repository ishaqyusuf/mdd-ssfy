import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react-native";
import {
  icons,
  Activity,
  AlertCircle,
  AppWindow,
  ArrowLeft,
  ArrowRight,
  BarChart2,
  BarChart3,
  Bell,
  Briefcase,
  Building,
  Building2,
  Calendar,
  CalendarCheck,
  Camera,
  ChartNoAxesColumn,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Clock,
  CreditCard,
  Delete,
  DoorOpen,
  Eye,
  EyeOff,
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
  Hourglass,
  House,
  Info,
  LayoutDashboard,
  LayoutGrid,
  List,
  ListChecks,
  ListX,
  Loader2,
  LocateIcon,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Minus,
  MoreHorizontal,
  Package,
  Pencil,
  Phone,
  PieChart,
  Pin,
  Plus,
  PlusCircle,
  Receipt,
  ReceiptText,
  Search,
  Settings,
  Share,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Compass,
  SearchX,
  Star,
  Heart,
  StickyNote,
  Trash,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Truck,
  User,
  UserCog,
  UserPlus,
  Users,
  UserX,
  Warehouse,
  Wallet,
  Wind,
  Wrench,
  X,
  XCircle,
  Zap,
  Route,
  Ban,
} from "lucide-react-native";
import { useColorScheme } from "@/hooks/use-color";
import { camel } from "@gnd/utils";
import { THEME } from "@/lib/theme";
import { View } from "react-native";
export type IconProps = LucideProps & {
  name?: IconKeys;
};

const iconSizes = {
  xs: 12,
  sm: 16,
  base: 20,
  md: 24,
  lg: 28,
  xl: 32,
  "2xl": 40,
};

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

  const _themColor =
    colorScheme === "dark" ? THEME.dark[color!] : THEME.light[color!];
  const styleFromClass = {
    color: _themColor || color,
    ...(opacity !== undefined ? { opacity } : {}),
  };
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
  if (!IconComponent)
    IconComponent = Icons[name!] || icons[name!] || Icons.X;
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

function Icon({
  className,
  size = "size-base",
  ...props
}: IconProps) {
  return (
    <IconImpl
      className={cn("text-foreground", className)}
      size={size}
      {...props}
    />
  );
}

export const Icons = {
  AppWindow,
  Activity,
  Analytics: BarChart2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Apps: AppWindow,
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
  Compass,
  CreditCard,
  Delete,
  DoorOpen,
  Eye,
  EyeOff,
  Fence,
  Filter: SlidersHorizontal,
  FilePenLine,
  FileText,
  FolderPlus,
  Gavel,
  Globe,
  GripHorizontal,
  HardHat,
  Hash,
  Heart,
  HelpCircle,
  Home: LayoutDashboard,
  Hourglass,
  House,

  Info,
  Jobs: Briefcase,
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
  MoreHoriz: MoreHorizontal,
  Package,

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
  SearchX,
  Settings,
  Share,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Star,
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
export type IconKeys = keyof typeof Icons | keyof typeof icons;
export { Icon };
