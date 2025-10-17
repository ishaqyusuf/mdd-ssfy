import { cn } from "@/lib/utils";
import { PrimitiveDivProps } from "@/types/type";

interface Props extends PrimitiveDivProps {}
export default function FContentShell({ children, className }: Props) {
    return <div className={cn("px-4 sm:px-6", className)}>{children}</div>;
}
