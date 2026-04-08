// import logo2 from "@/public/logo.png";
import Link from "@/components/link";
import { cn } from "@/lib/utils";
import { Icon as SharedIcon, Icons as BaseIcon, type Icon as SharedIconType } from "@gnd/ui/icons";
import { type VariantProps, cva } from "class-variance-authority";
import Image from "next/image";
export type Icon = SharedIconType;

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
    return (
        <SharedIcon
            name={name as never}
            className={cn("", iconVariants(props), className)}
        />
    );
}
