import { env } from "@/env.mjs";
import { formatMoney } from "@/lib/use-number";

let devMode = env.NODE_ENV != "production";
// devMode = false;
export const SQUARE_LOCATION_ID = devMode
    ? env.SQUARE_SANDBOX_LOCATION_ID
    : env.SQUARE_LOCATION_ID;

// export const squareClient = squareClient;
export { squareClient } from "@gnd/square";
export const amountFromCent = (amount) => {
    if (!amount) return amount;
    amount = Number(amount);
    return formatMoney(amount / 100);
};
