import { cn } from "@/lib/utils";
import type { LucideIcon, LucideProps } from "lucide-react-native";
import {
  Activity,
  AlertCircle,
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
  Check,
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
  Gavel,
  GripHorizontal,
  HardHat,
  Hash,
  Hourglass,
  House,
  Info,
  LayoutDashboard,
  LayoutGrid,
  List,
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
  TrendingDown,
  TrendingUp,
  TriangleAlert,
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

  props.size =
    +props?.className
      ?.split(" ")
      ?.find((a) => a.startsWith("size-"))
      ?.split("-")?.[1]! || props.size;
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
  size = 14,
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
  Delete,
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  CircleCheck,
  CircleDollarSign,
  CreditCard,
  DoorOpen,
  Fence,
  FilePenLine,
  FileText,
  Gavel,
  GripHorizontal,
  HardHat,
  Hash,
  home: LayoutDashboard,
  Hourglass,
  House,

  Info,
  jobs: Briefcase,
  LayoutDashboard,
  LayoutGrid,
  List,
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
};
export type IconKeys = keyof typeof appIcons;
export { Icon };
