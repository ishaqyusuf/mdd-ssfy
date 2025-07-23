import { Colors, getColorFromName } from "@/lib/color";
import { cn } from "@/lib/utils";

import { Progress as BaseProgress } from "@gnd/ui/progress";
import { percent } from "@gnd/utils";
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
    score;
    total;
    showPercent?: boolean;
    label?: string;
}
function ProgressBar({
    children,
    className,
    showPercent,
    label,
    score,
    total,
}: ProgressBarProps) {
    const value = percent(score, total, 12);
    return (
        <div className={cn(className)}>
            <div className="flex justify-between">
                <div>{label ? `${score} of ${total} ${label}` : ""}</div>
                <div>{showPercent ? `${value}%` : null}</div>
            </div>
            <BaseProgress className="h-2" value={value} />
        </div>
    );
}
export const Progress = Object.assign(ProgressBase, {
    Status,
    ProgressBar,
    Progress: BaseProgress,
});
