import { randomNumber } from "./utils";

export async function timeout(ms = 1000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function rndTimeout() {
    return await timeout(randomNumber(2));
}
