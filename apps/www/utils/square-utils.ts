import { formatMoney } from "@/lib/use-number";
import { Client, Environment } from "square";

let devMode = process.envNODE_ENV != "production";
// devMode = false;
export const SQUARE_LOCATION_ID = devMode
    ? process.envSQUARE_SANDBOX_LOCATION_ID
    : process.envSQUARE_LOCATION_ID;

export const squareClient = new Client({
    environment: devMode ? Environment.Sandbox : Environment.Production,
    accessToken: devMode
        ? process.envSQUARE_SANDBOX_ACCESS_TOKEN
        : process.envSQUARE_ACCESS_TOKEN,
});

export const amountFromCent = (amount) => {
    if (!amount) return amount;
    amount = Number(amount);
    return formatMoney(amount / 100);
};
