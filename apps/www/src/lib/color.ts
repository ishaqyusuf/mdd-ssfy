import {
    colorsObject,
    getColorFromName as baseGetColorFromName,
} from "@gnd/utils/colors";
export function getBadgeColor(status: string | null, _default = "slate") {
    return _getStatusColor(statusColor(status, _default));
}
export function statusColor(status, _default = "slate") {
    if (!status) return _default;
    let color: Colors | undefined = status
        ? StatusColorMap[(status?.toLowerCase() || "").replace(" ", "_")]
        : _default || ("slate" as any);
    return color || _default;
}
export function getColorFromName(name) {
    const color =
        StatusColorMap[(name?.toLowerCase() || "").replace(" ", "_")] ||
        baseGetColorFromName(name);
    return color;
}
export function _getStatusColor(color) {
    if (!color) color = "slate";
    return `bg-${color}-500 hover:bg-${color}-600`;
}
const StatusColorMap: { [key: string]: string } = {
    active: colorsObject.blue,
    due_yesterday: colorsObject.red,
    queued: colorsObject.orange,
    pending: colorsObject.azure,
    completed: colorsObject.emerald,
    resolved: colorsObject.emerald,
    available: colorsObject.emerald,
    success: colorsObject.emerald,
    started: colorsObject.blue,
    check: colorsObject.blue,
    scheduled: colorsObject.blue,
    incomplete: colorsObject.orange,
    queue: colorsObject.orange,
    in_progress: colorsObject.pink,
    cancelled: colorsObject.red,
    canceled: colorsObject.red,
    "payment not up to date": colorsObject.red,
    pickup: colorsObject.pink,
    cash: colorsObject.pink,
    "duplicate payments": colorsObject.orange,
    late: colorsObject.red,
    in_transit: colorsObject.pink,
    "credit-card": colorsObject.pink,
    approved: colorsObject.emerald,
    verified: colorsObject.emerald,
    link: colorsObject.emerald,
    assigned: colorsObject.emerald,
    order_placed: colorsObject.sky,
    delivery: colorsObject.emerald,
    arrived_warehouse: colorsObject.emerald,
    item_not_available: colorsObject.orange,
    payment_cancelled: colorsObject.orange,
    prod_queued: colorsObject.orange,
    overpayment: colorsObject.red,
    terminal: colorsObject.purple,
    deco: colorsObject.orange,
    evaluating: colorsObject.orange,
    punchout: colorsObject.emerald,
} as const;

// const __colors = Object.values(StatusColorMap) as const;
export type Colors =
    | "slate"
    | "gray"
    | "zinc"
    | "neutral"
    | "stone"
    | "red"
    | "orange"
    | "amber"
    | "yellow"
    | "lime"
    | "green"
    | "emerald"
    | "teal"
    | "cyan"
    | "sky"
    | "blue"
    | "indigo"
    | "violet"
    | "purple"
    | "fuchsia"
    | "pink"
    | "rose"
    | "lightBlue"
    | "warmGray"
    | "trueGray"
    | "coolGray"
    | "blueGray";
