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
    badge?;
}
function Status(props: StatusProps) {
    const { children, noDot, badge } = props;
    const _color = getColorFromName(children);
    return (
        <div
            className={cn(
                "inline-flex items-center gap-2 font-semibold",
                !badge || "rounded-lg p-0.5 px-2",
            )}
            style={{
                backgroundColor: badge ? _color : null,
            }}
        >
            {noDot || badge || (
                <div
                    style={{
                        backgroundColor: _color,
                    }}
                    className={cn("size-1.5")}
                ></div>
            )}
            <div
                style={{
                    color: badge ? `white` : _color,
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
        <div className={cn(className, "space-y-2")}>
            {(!showPercent && !label) || (
                <div className="flex text-muted-foreground font-medium justify-between">
                    {!label || (
                        <span className="text-sm">
                            {label ? `${score} of ${total} ${label}` : ""}
                        </span>
                    )}
                    <span className="text-sm font-medium">
                        {showPercent ? `${value}%` : null}
                    </span>
                </div>
            )}
            <BaseProgress className="h-2" value={value} />
        </div>
    );
}
export const Progress = Object.assign(ProgressBase, {
    Status,
    ProgressBar,
    Progress: BaseProgress,
});
