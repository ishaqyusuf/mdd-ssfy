import { Colors, getColorFromName, statusColor } from "@/lib/color";
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
function Status({ children, noDot }: StatusProps) {
    const _color = getColorFromName(children);
    return (
        <div className="inline-flex items-center gap-2 font-semibold">
            {noDot || (
                <div
                    style={{
                        backgroundColor: _color,
                    }}
                    className={cn("size-1.5")}
                ></div>
            )}
            <div
                style={{
                    color: _color,
                }}
                className={cn("text-xs uppercase")}
            >
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
