import { env } from "@/env.mjs";
import { formatMoney } from "@/lib/use-number";
import { Client, Environment } from "square";

let devMode = env.NODE_ENV != "production";
// devMode = false;
export const SQUARE_LOCATION_ID = devMode
    ? env.SQUARE_SANDBOX_LOCATION_ID
    : env.SQUARE_LOCATION_ID;

export const squareClient = new Client({
    environment: devMode ? Environment.Sandbox : Environment.Production,
    accessToken: devMode
        ? env.SQUARE_SANDBOX_ACCESS_TOKEN
        : env.SQUARE_ACCESS_TOKEN,
});

export const amountFromCent = (amount) => {
    if (!amount) return amount;
    amount = Number(amount);
    return formatMoney(amount / 100);
};
