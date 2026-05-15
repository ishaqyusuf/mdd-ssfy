import { dealerAuth } from "@gnd/auth/better-auth/dealership";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(dealerAuth);
