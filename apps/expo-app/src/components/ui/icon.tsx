import { cn } from "@/lib/utils";
import type { LucideProps } from "lucide-react-native";
import {
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
  SlidersHorizontal,
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
  Wallet,
  Wind,
  Wrench,
  X,
  XCircle,
  Zap,
} from "lucide-react-native";
import { useColorScheme } from "@/hooks/use-color";
import { camel } from "@gnd/utils";
import { THEME } from "@/lib/theme";
import { View } from "react-native";
export type IconProps = LucideProps & {
  name?: IconKeys;
  // strokeWidth?: number;
  // absoluteStrokeWidth?: boolean;
};
// type T = IconProps['strokeWidth']
const iconSizes = {
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
  const [, ...colorChunk] =
    props.className
      ?.split(" ")
      ?.reverse()
      ?.find((a) => a?.startsWith("text-"))
      ?.split("-") || [];
  const color = colorChunk?.length ? camel(colorChunk?.join(" ")) : undefined;

  const _themColor = THEME.light[color!];
  // colorScheme === "dark" ? THEME.dark[color!] : THEME.light[color!];

  props.style = {
    ...(props.style || ({} as any)),
    color: _themColor || color,
  };

  let sizestr = props?.className
    ?.split(" ")
    ?.find((a) => a.startsWith("size-"))
    ?.split("-")?.[1]!;
  if (sizestr?.startsWith("[")) {
    sizestr = sizestr.replace(/[\[\]px]/g, "");
  }
  sizestr = iconSizes[sizestr] || sizestr || iconSizes?.base;

  props.size = +sizestr || props.size;
  if (!IconComponent) IconComponent = appIcons![name!] || appIcons.X;
  const otherClasses = props.className
    ?.split(" ")
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
export { Icon };
