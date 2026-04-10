interface NodeStacks {
    type: "stack" | "inline";
    lines: NodeLine[];
}
interface NodeLine {
    type: "text" | "link" | "table";
    rows?: string[];
    lines?: NodeLine[][];
    href?: string;
    text?: string;
    style?;
}
export const composeStackLine = (lines: NodeLine[]): NodeStacks => ({
    type: "stack",
    lines,
});
const composeInline = (lines: NodeLine[]): NodeStacks => ({
    type: "inline",
    lines,
});
export const composeText = (text, style?): NodeLine => ({
    type: "text",
    text,
    style,
});
const composeLink = (text, href, style?): NodeLine => ({
    type: "link",
    text,
    href,
    style,
});
const composeTable = (
    rows: string[],
    lines?: NodeLine[][]
): NodeLine => ({
    type: "table",
    rows,
    lines,
});
export const mailComposer = {
    table: composeTable,
    text: composeText,
    inline: composeInline,
    link: composeLink,
    tableRow: (...lines: (NodeLine | string)[]) => {
        return lines.map((line) => {
            if (typeof line === "string") return mailComposer.text(line);
            return line;
        });
    },
};
