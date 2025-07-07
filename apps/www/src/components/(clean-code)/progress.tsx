import { Colors, statusColor } from "@/lib/status-badge";
import { cn } from "@/lib/utils";

interface ProgressBaseProps {
    children?;
    className?;
}
function ProgressBase({ children, className }: ProgressBaseProps) {
    return (
        <div className={cn("flex flex-col items-start", className)}>
            {children}
        </div>
    );
}
interface StatusProps {
    noDot?: boolean;
    children;
    color?: Colors;
}
function Status({ children, noDot, color }: StatusProps) {
    const _color = color || statusColor(children);
    return (
        <div className="inline-flex items-center gap-2 font-semibold">
            {!noDot && (
                <div className={cn("w-1.5 h-1.5", `bg-${_color}-500`)}></div>
            )}

            <div className={cn(`text-${_color}-500`, "text-xs uppercase")}>
                {children}
            </div>
        </div>
    );
}
interface ProgressBarProps {
    children?;
    className?;
}
function ProgressBar({ children, className }: ProgressBarProps) {
    return <div className={cn(className)}>{children}</div>;
}
export const Progress = Object.assign(ProgressBase, {
    Status,
    ProgressBar,
});
