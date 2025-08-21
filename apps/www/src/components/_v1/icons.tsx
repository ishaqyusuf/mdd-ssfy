import Image from "next/image";
// import logo2 from "@/public/logo.png";
import Link from "@/components/link";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import { Icons as BaseIcon, Icon as LucideIcon } from "@gnd/ui/custom/icons";
import { Archive, CheckCircle, FileEdit } from "lucide-react";
export type Icon = LucideIcon;

export const Icons = {
    ...BaseIcon,
    Logo: () => <Image alt="" src={"/logo_mini.png"} width={48} height={48} />,
    LogoLg: () => <Image alt="" src={"/logo.png"} height={48} width={120} />,
    logoLg: ({ width = 120 }) => (
        <Link href="/">
            <Image alt="" src={"/logo.png"} height={48} width={width} />
        </Link>
    ),
    logo: () => (
        <Link href="/">
            <Image alt="" src={"/logo_mini.png"} width={48} height={48} />
        </Link>
    ),
    PrintLogo: () => (
        <Link href="/">
            <Image
                alt=""
                onLoadingComplete={(img) => {}}
                width={178}
                height={80}
                src={"/logo.png"}
            />
        </Link>
    ),
    Transactions2: (props: any) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={40}
            height={40}
            fill="none"
            {...props}
        >
            <path
                fill="currentColor"
                d="M23.333 16.667H5V20h18.333v-3.333Zm0-6.667H5v3.333h18.333V10ZM5 26.667h11.667v-3.334H5v3.334Zm19 10 4.333-4.334 4.334 4.334L35 34.333 30.667 30 35 25.667l-2.333-2.334-4.334 4.334L24 23.333l-2.333 2.334L26 30l-4.333 4.333L24 36.667Z"
            />
        </svg>
    ),
    Draft: FileEdit,
    Published: CheckCircle,
    Archived: Archive,
    Archive: Archive,
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
}: { name: IconKeys; className? } & VariantProps<typeof iconVariants>) {
    const RenderIcon = Icons[name];
    if (!RenderIcon) return null;
    return <RenderIcon className={cn("", iconVariants(props), className)} />;
}
