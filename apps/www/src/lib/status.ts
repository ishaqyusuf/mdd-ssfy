export const InboundStatus = [
    "Pending",
    "Order Placed",
    "In Transit",
    "Arrived Warehouse",
    // "Stocked",
];
export interface Progressor {
    color;
    percentage;
    score;
    total;
}
export function getProgress(score, total): Progressor | null {
    if (!score || !total) return null;
    const p = ((score || 0) / (total || 1)) * 100;
    let color = "";
    if (p < 25) {
        color = "red";
    } else if (p < 50) {
        color = "yellow";
    } else if (p < 75) {
        color = "orange";
    } else {
        color = "green";
    }
    return {
        color,
        percentage: p,
        score,
        total,
    };
}
