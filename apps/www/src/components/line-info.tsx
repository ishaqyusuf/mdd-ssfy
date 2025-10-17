export function LineInfo({
    label,
    value,
    children,
}: {
    label?: string;
    value?;
    children?;
}) {
    return (
        <div className="b flex items-center gap-4 border-b p-1 py-2">
            <span className="text-sm font-semibold uppercase text-muted-foreground">
                {label}:
            </span>
            <div className="flex-1"></div>
            <span className="font-mono$ text-sm uppercase">{value}</span>
            {children}
        </div>
    );
}

