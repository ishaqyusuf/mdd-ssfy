import * as React from "react";
import {
  Add01Icon,
  AiGenerativeIcon,
  Analytics02Icon,
  Alert02Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  Attachment01Icon,
  Calendar03Icon,
  Call02Icon,
  Cancel01Icon,
  ChartHistogramIcon,
  CheckmarkCircle02Icon,
  CheckmarkSquare02Icon,
  Clock01Icon,
  Copy01Icon,
  CreditCardIcon,
  Delete02Icon,
  DocumentAttachmentIcon,
  Edit02Icon,
  File02Icon,
  FilePinIcon,
  FileViewIcon,
  FileZipIcon,
  FilterHorizontalIcon,
  Folder01Icon,
  FolderZipIcon,
  Home09Icon,
  InboxIcon,
  Invoice01Icon,
  LaptopCheckIcon,
  Logout02Icon,
  Mail01Icon,
  MapPinpoint01Icon,
  Menu02Icon,
  MoneyBag02Icon,
  MoreHorizontalIcon,
  MultiplicationSignIcon,
  NoteIcon,
  Notification03Icon,
  PackageIcon,
  Pdf01Icon,
  PinIcon,
  Search01Icon,
  Settings01Icon,
  Share08Icon,
  Shield01Icon,
  StructureFolderIcon,
  Task01Icon,
  TextBoldIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TruckIcon,
  Unlink01Icon,
  UserIcon,
  ViewIcon,
  ViewOffIcon,
  Wallet01Icon,
  WhatsappIcon,
  Wrench01Icon,
  Briefcase02Icon,
  Remove01Icon,
  Link01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../utils";

type SharedIconProps = React.SVGProps<SVGSVGElement> & {
  size?: number | string;
  strokeWidth?: number;
};

type IconComponent = React.ComponentType<SharedIconProps>;

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

function createHugeIcon(icon: IconSvgElement): IconComponent {
  const RenderHugeIcon = ({
    className,
    size = 20,
    strokeWidth = 1.7,
    ...props
  }: SharedIconProps) =>
    (
      <HugeiconsIcon
        {...({
          icon,
          className,
          size,
          strokeWidth,
          ...props,
        } as any)}
      />
    );

  RenderHugeIcon.displayName = "HugeIcon";

  return RenderHugeIcon;
}

function createWordmark({
  compact = false,
}: {
  compact?: boolean;
} = {}): IconComponent {
  const width = compact ? 24 : 112;
  const height = compact ? 24 : 32;

  const Wordmark = ({ className, ...props }: SharedIconProps) => (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect
        x="1"
        y="1"
        width={compact ? 22 : 110}
        height={compact ? 22 : 30}
        rx={compact ? 7 : 10}
        fill="currentColor"
        opacity="0.1"
      />
      <rect
        x="4"
        y="4"
        width={compact ? 16 : 24}
        height={compact ? 16 : 24}
        rx={compact ? 5 : 8}
        fill="currentColor"
      />
      {compact ? (
        <path
          d="M11 9h2.4l2.8 6H14l-.5-1.3h-2.6l-.5 1.3H8.3L11 9Zm.4 3.2h1.4l-.7-1.9-.7 1.9Z"
          fill="white"
        />
      ) : (
        <>
          <text
            x="36"
            y="20.5"
            fill="currentColor"
            fontSize="12"
            fontWeight="700"
            letterSpacing="0.18em"
          >
            GND
          </text>
          <text
            x="36"
            y="27"
            fill="currentColor"
            opacity="0.7"
            fontSize="6"
            fontWeight="600"
            letterSpacing="0.16em"
          >
            WORKSPACE
          </text>
        </>
      )}
    </svg>
  );

  Wordmark.displayName = compact ? "Logo" : "LogoLg";

  return Wordmark;
}

const Logo = createWordmark({ compact: true });
const LogoLg = createWordmark();
const PrintLogo = createWordmark();

const Add = createHugeIcon(Add01Icon);
const AI = createHugeIcon(AiGenerativeIcon);
const Accounts = createHugeIcon(CreditCardIcon);
const Amount = createHugeIcon(MoneyBag02Icon);
const ArrowDown = createHugeIcon(ArrowDown01Icon);
const ArrowLeft = createHugeIcon(ArrowLeft01Icon);
const ArrowOutward = createHugeIcon(ArrowUpRight01Icon);
const ArrowRight = createHugeIcon(ArrowRight01Icon);
const ArrowRightAlt = createHugeIcon(ArrowRight01Icon);
const ArrowUp = createHugeIcon(ArrowUp01Icon);
const Attachments = createHugeIcon(Attachment01Icon);
const CalendarMonth = createHugeIcon(Calendar03Icon);
const Category = createHugeIcon(StructureFolderIcon);
const Check = createHugeIcon(CheckmarkCircle02Icon);
const ChevronDown = createHugeIcon(ArrowDown01Icon);
const ChevronLeft = createHugeIcon(ArrowLeft01Icon);
const ChevronRight = createHugeIcon(ArrowRight01Icon);
const ChevronUp = createHugeIcon(ArrowUp01Icon);
const Clear = createHugeIcon(Remove01Icon);
const Close = createHugeIcon(Cancel01Icon);
const Copy = createHugeIcon(Copy01Icon);
const Delete = createHugeIcon(Delete02Icon);
const Description = createHugeIcon(File02Icon);
const Edit = createHugeIcon(Edit02Icon);
const Email = createHugeIcon(Mail01Icon);
const Error = createHugeIcon(DocumentAttachmentIcon);
const ExitToApp = createHugeIcon(Logout02Icon);
const Export = createHugeIcon(Share08Icon);
const Filter = createHugeIcon(FilterHorizontalIcon);
const FolderZip = createHugeIcon(FolderZipIcon);
const Inbox = createHugeIcon(InboxIcon);
const Menu = createHugeIcon(Menu02Icon);
const MoreHoriz = createHugeIcon(MoreHorizontalIcon);
const Notifications = createHugeIcon(Notification03Icon);
const Pdf = createHugeIcon(Pdf01Icon);
const Repeat = createHugeIcon(Task01Icon);
const Search = createHugeIcon(Search01Icon);
const Settings = createHugeIcon(Settings01Icon);
const Status = createHugeIcon(Analytics02Icon);
const Time = createHugeIcon(Clock01Icon);
const Trash = createHugeIcon(Delete02Icon);
const User = createHugeIcon(UserIcon);
const View = createHugeIcon(ViewIcon);
const Hide = createHugeIcon(ViewOffIcon);
const Warn = createHugeIcon(Alert02Icon);
const WhatsApp = createHugeIcon(WhatsappIcon);
const X = createHugeIcon(MultiplicationSignIcon);
const Placeholder = createHugeIcon(FileViewIcon);
const Spinner = createHugeIcon(Analytics02Icon);

export type Icon = IconComponent;

export const PaymentMethodIcon = {
  Link: createHugeIcon(Share08Icon),
  Cash: createHugeIcon(MoneyBag02Icon),
  Zelle: createHugeIcon(Wallet01Icon),
  Terminal: createHugeIcon(CreditCardIcon),
  Check: createHugeIcon(CheckmarkSquare02Icon),
  Others: createHugeIcon(Wallet01Icon),
  Wallet: createHugeIcon(Wallet01Icon),
  Banknote: createHugeIcon(MoneyBag02Icon),
};

export const Icons = {
  AI,
  AccountCircle: User,
  Accounts,
  Add,
  Address: createHugeIcon(MapPinpoint01Icon),
  Amount,
  Apps: createHugeIcon(Menu02Icon),
  Archive: createHugeIcon(FilePinIcon),
  ArrowDown,
  ArrowLeft,
  ArrowOutward,
  ArrowRight,
  ArrowRightAlt,
  ArrowUp,
  Attachments,
  BrokenImage: createHugeIcon(FileViewIcon),
  Calendar: createHugeIcon(Calendar03Icon),
  CalendarIcon: createHugeIcon(Calendar03Icon),
  CalendarMonth,
  Category,
  Check,
  CheckCircle: Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown: createHugeIcon(ChartHistogramIcon),
  Clear,
  Close,
  CommunityInvoice: createHugeIcon(Invoice01Icon),
  CommunitySettings: Settings,
  Component: createHugeIcon(StructureFolderIcon),
  Copy,
  CustomerService: createHugeIcon(NoteIcon),
  Dashboard: createHugeIcon(Home09Icon),
  Delete,
  Delivery: createHugeIcon(TruckIcon),
  Description,
  Documents: createHugeIcon(FilePinIcon),
  Dollar: createHugeIcon(MoneyBag02Icon),
  DragIndicator: createHugeIcon(PinIcon),
  Edit,
  Edit2: Edit,
  Email,
  Eye: View,
  EyeOff: Hide,
  Error,
  Estimates: createHugeIcon(MoneyBag02Icon),
  ExitToApp,
  Export,
  Filter,
  FolderZip,
  Hide,
  HelpCircle: Warn,
  Hrm: createHugeIcon(UserIcon),
  Inbox,
  Inbound: createHugeIcon(PackageIcon),
  Installation: createHugeIcon(Wrench01Icon),
  Jobs: createHugeIcon(Briefcase02Icon),
  Laptop: createHugeIcon(LaptopCheckIcon),
  Logo,
  LogoLg,
  Menu,
  Minus: Clear,
  MoreHoriz,
  Move2: createHugeIcon(PinIcon),
  Notifications,
  Orders: createHugeIcon(Invoice01Icon),
  Payment: createHugeIcon(CreditCardIcon),
  Pdf,
  Percent: createHugeIcon(ChartHistogramIcon),
  Phone: createHugeIcon(Call02Icon),
  Placeholder,
  Plus: Add,
  Print: PrintLogo,
  PrintLogo,
  Production: createHugeIcon(PackageIcon),
  Products: createHugeIcon(Folder01Icon),
  Project: createHugeIcon(StructureFolderIcon),
  Punchout: createHugeIcon(ChartHistogramIcon),
  Reciept: createHugeIcon(Invoice01Icon),
  Repeat,
  SalesSettings: Settings,
  Save: createHugeIcon(FilePinIcon),
  SaveAndClose: createHugeIcon(FilePinIcon),
  Search,
  Settings,
  Settings2: Settings,
  SortDesc: createHugeIcon(ChartHistogramIcon),
  Spinner,
  Status,
  Tasks: createHugeIcon(Task01Icon),
  Time,
  Transactions2: createHugeIcon(Invoice01Icon),
  Trash,
  Units: createHugeIcon(Home09Icon),
  User,
  View,
  Warn,
  WhatsApp,
  Wallet: createHugeIcon(Wallet01Icon),
  Banknote: createHugeIcon(MoneyBag02Icon),
  CreditCard: createHugeIcon(CreditCardIcon),
  Bold: createHugeIcon(TextBoldIcon),
  Italic: createHugeIcon(TextItalicIcon),
  Link: createHugeIcon(Link01Icon),
  LinkOff: createHugeIcon(Unlink01Icon),
  Loader2: Spinner,
  Terminal: createHugeIcon(CreditCardIcon),
  Strikethrough: createHugeIcon(TextStrikethroughIcon),
  Wrench: createHugeIcon(Wrench01Icon),
  X,
  LogoSm: Logo,
  LogoSmall: Logo,
  logo: Logo,
  logoLg: LogoLg,
};

export type IconKeys = keyof typeof Icons;

export function Icon({
  name,
  Icon: IconOverride,
  className,
  ...props
}: {
  name?: IconKeys;
  className?: string;
  Icon?: IconComponent;
} & VariantProps<typeof iconVariants>) {
  const RenderIcon = (name ? Icons[name] : undefined) || IconOverride;

  if (!RenderIcon) {
    return name ? <>{name}</> : null;
  }

  return <RenderIcon className={cn(iconVariants(props), className)} />;
}

export const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "success":
      return <Icons.Check className="h-4 w-4 text-green-500" />;
    case "failed":
      return <Icons.X className="h-4 w-4 text-red-500" />;
    case "cancelled":
      return <Icons.X className="h-4 w-4 text-gray-500" />;
    case "pending":
      return <Icons.Time className="h-4 w-4 text-yellow-500" />;
    case "disputed":
      return <Icons.Warn className="h-4 w-4 text-orange-500" />;
    default:
      return <Icons.Time className="h-4 w-4" />;
  }
};
