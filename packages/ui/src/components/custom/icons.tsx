import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Copy,
  CreditCard,
  File,
  FileText,
  HelpCircle,
  Image as media,
  Laptop,
  Loader2,
  LucideProps,
  Moon,
  MoreVertical,
  Pizza,
  Plus,
  Settings,
  SunMedium,
  Trash,
  Twitter,
  User,
  X,
  type LucideIcon,
  EyeOff,
  Eye,
  Menu,
  Pencil,
  BadgeDollarSign,
  ClipboardEdit,
  ShoppingBag,
  Banknote,
  Package,
  Construction,
  ArrowLeft,
  BookOpen,
  Printer,
  Save,
  FolderClosed,
  MoreVerticalIcon,
  Settings2,
  LayoutDashboard,
  Cog,
  FolderGit2,
  Home,
  NewspaperIcon,
  Pin,
  Cpu,
  ClipboardList,
  LayoutTemplate,
  Briefcase,
  Truck,
  PackageOpen,
  Merge,
  Percent,
  Delete,
  Mail,
  Layers,
  Eraser,
  Edit2,
  ArrowUp,
  ArrowDown,
  Move,
  Rocket,
  Phone,
  MapPin,
  Info,
  Timer,
  Receipt,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ImageIcon,
  Send,
  LineChart,
  Box,
  Download,
  MoreHorizontal,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  UserCircle,
  ShieldIcon,
  TimerIcon,
  Users,
  Flag,
  Smartphone,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  SortDesc,
  Activity,
  Monitor,
  FolderTree,
  Wrench,
  PackagePlus,
} from "lucide-react";

import { Cross2Icon, DashboardIcon } from "@radix-ui/react-icons";

import { cva, VariantProps } from "class-variance-authority";
import { cn } from "../../utils";

export type Icon = LucideIcon;
type SVGIconProps = {
  size?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  viewBox?: string;
};
const SVGIcon: React.FC<SVGIconProps> = ({
  size = 20,
  stroke = "currentColor",
  fill = "currentColor",
  strokeWidth = 0.25,
  className,
  children,
  viewBox,
}) => {
  const intrinsicContentDimension = 20;
  const defaultViewBox = `0 0 ${intrinsicContentDimension} ${intrinsicContentDimension}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox || defaultViewBox}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
};
export const PaymentMethodIcon = {
  link: Smartphone,
  cash: Banknote,
  zelle: Smartphone,
  terminal: CreditCard,
  check: Building,
  others: DollarSign,
  wallet: Banknote,
};
export const Icons = {
  Status: Activity,
  profile: UserCircle,
  dashbord2: DashboardIcon,
  edit2: Edit2,
  box: Box,
  roles: ShieldIcon,
  Filter: Filter,
  Menu: MoreHorizontal,
  pdf: File,
  Search: Search,
  Export: Download,
  placeholder: ImageIcon,
  reciept: Receipt,
  X: Cross2Icon,
  calendar: Calendar,
  dollarSign: DollarSign,
  TrendingUp: TrendingUp,
  TrendingDown: TrendingDown,
  Notification: AlertCircle,

  time: Timer,
  cart: ShoppingBag,

  delivery2: Send,
  pickup: Package,
  Merge: Merge,
  Warn: Info,
  Rocket: Rocket,
  Delete: Delete,
  orders: ShoppingBag,
  project: FolderGit2,
  phone: Phone,
  address: MapPin,
  units: Home,
  tasks: Pin,
  payment: CreditCard,
  pendingPayment: TimerIcon,
  punchout: Cpu,
  hrm: LayoutTemplate,
  communitySettings: LayoutTemplate,
  component: Layers,
  clear: Eraser,
  Email: Mail,
  sortDesc: SortDesc,
  jobs: Briefcase,
  dealer: Briefcase,
  customerService: ClipboardList,
  communityInvoice: NewspaperIcon,
  dashboard: LayoutDashboard,
  salesSettings: Cog,
  save: Save,
  saveAndClose: FolderClosed,
  estimates: Banknote,
  send: Send,
  packingList: Package,
  production: Construction,
  open: BookOpen,
  close: X,
  print: Printer,
  menu: Menu,
  spinner: Loader2,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  trash: Trash,
  post: FileText,
  page: File,
  percent: Percent,
  media,
  more: MoreVerticalIcon,
  settings: Settings,
  settings2: Settings2,
  billing: CreditCard,
  products: PackageOpen,
  ellipsis: MoreVertical,
  add: Plus,
  dollar: BadgeDollarSign,
  inbound: Package,
  warning: AlertTriangle,
  employees: Users,
  user: User,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  move2: Move,
  help: HelpCircle,
  pizza: Pizza,
  delivery: Truck,
  copy: Copy,
  copyDone: ClipboardCheck,
  sun: SunMedium,
  moon: Moon,
  laptop: Laptop,
  lineChart: LineChart,
  hide: EyeOff,
  view: Eye,
  flag: Flag,
  edit: ClipboardEdit,
  ...PaymentMethodIcon,
  monitor: Monitor,
  category: FolderTree,
  builder: Wrench,
  installation: PackagePlus,
  WhatsApp: (props: SVGIconProps) => (
    <SVGIcon {...props} viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </SVGIcon>
  ),
};

export type IconKeys = keyof typeof Icons;
const iconVariants = cva("", {
  variants: {
    variant: {
      primary: "text-primary",
      muted: "text-muted-foreground",
      destructive: "text-red-600",
    },
    size: {
      sm: "size-4",
      default: "",
    },
  },
  defaultVariants: {
    size: "default",
    variant: "muted",
  },
});
export function Icon({
  name,
  className,
  ...props
}: { name: IconKeys; className?: string } & VariantProps<typeof iconVariants>) {
  const RenderIcon = Icons[name];
  if (!RenderIcon) return null;
  return <RenderIcon className={cn("", iconVariants(props), className)} />;
}
export const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "cancelled":
      return <XCircle className="h-4 w-4 text-gray-500" />;
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "disputed":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};
